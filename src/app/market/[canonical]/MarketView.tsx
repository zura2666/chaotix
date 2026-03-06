"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  ArrowLeft,
  TrendingUp,
  Users,
  Droplets,
  Activity,
  Share2,
  MessageSquare,
} from "lucide-react";
import { LiquidityPanel } from "@/components/LiquidityPanel";
import { QuickTrade } from "@/components/QuickTrade";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { ChaotixButton } from "@/components/ui/ChaotixButton";

type PricePoint = { id: string; price: number; timestamp: string };
type Position = {
  id: string;
  shares: number;
  avgPrice?: number;
  user: { id: string; name: string | null; email: string | null };
};
type Trade = {
  id: string;
  side: string;
  shares: number;
  price: number;
  total: number;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null };
};
type Comment = {
  id: string;
  body: string;
  sentiment: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null };
};
type Market = {
  id: string;
  canonical: string;
  displayName: string;
  price: number;
  volume: number;
  tradeCount: number;
  reserveTokens?: number;
  reserveShares?: number;
  positions: Position[];
  priceHistory: PricePoint[];
  recentTrades: Trade[];
};

const CHART_PERIODS = ["1H", "1D", "1W", "1M"] as const;
type ChartPeriod = (typeof CHART_PERIODS)[number];

const POLL_INTERVAL_MS = 5000;
const PRICE_PULSE_MS = 1500;

export function MarketView({
  market: initialMarket,
}: {
  market: Market;
}) {
  const [market, setMarket] = useState(initialMarket);
  const [user, setUser] = useState<{ id: string; balance: number } | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [liquidityStatus, setLiquidityStatus] = useState<"healthy" | "thin" | "risky" | null>(null);
  const [triggerSellMax, setTriggerSellMax] = useState<number | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("1D");
  const [priceJustUpdated, setPriceJustUpdated] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);

  const refreshMarket = useCallback(() => {
    fetch(`/api/markets/${encodeURIComponent(market.canonical)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.market) {
          const prevPrice = market.price;
          setMarket(d.market);
          if (d.market.price !== prevPrice) {
            setPriceJustUpdated(true);
            const t = setTimeout(() => setPriceJustUpdated(false), PRICE_PULSE_MS);
            return () => clearTimeout(t);
          }
        }
      });
  }, [market.canonical, market.price]);

  useEffect(() => {
    fetch(
      `/api/markets/liquidity-health?canonical=${encodeURIComponent(market.canonical)}`
    )
      .then((r) => r.json())
      .then((d) => setLiquidityStatus(d.status ?? null))
      .catch(() => {});
  }, [market.canonical]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user));
  }, []);

  useEffect(() => {
    if (!user) return;
    refreshMarket();
  }, [user, market.canonical]);

  useEffect(() => {
    const id = setInterval(refreshMarket, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refreshMarket]);

  useEffect(() => {
    if (!user || !market.positions) return;
    const pos = market.positions.find(
      (p: { user: { id: string } }) => p.user.id === user.id
    );
    setPosition(pos ?? null);
  }, [user?.id, market.positions]);

  useEffect(() => {
    fetch(`/api/markets/${encodeURIComponent(market.canonical)}/comments`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))
      .catch(() => setComments([]));
  }, [market.canonical]);

  const submitTradePayload = async (
    side: "buy" | "sell",
    amount?: number,
    shares?: number
  ) => {
    setError("");
    setLoading(true);
    try {
      const body =
        side === "buy"
          ? { action: "buy", marketId: market.id, amount }
          : { action: "sell", marketId: market.id, shares };
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const csrfMatch = typeof document !== "undefined" ? document.cookie.match(/csrf_token=([^;]+)/) : null;
      if (csrfMatch?.[1]) headers["x-csrf-token"] = decodeURIComponent(csrfMatch[1]);
      const res = await fetch("/api/trade", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Trade failed");
        return;
      }
      if (data.balance !== undefined && user) {
        setUser({ ...user, balance: data.balance });
      }
      refreshMarket();
      if (position && side === "sell" && shares != null) {
        setPosition({ ...position, shares: Math.max(0, position.shares - shares) });
      } else if (side === "buy" && data.shares) {
        setPosition({
          ...(position ?? { id: "", shares: 0, avgPrice: 0, user: { id: user!.id, name: null, email: null } }),
          shares: (position?.shares ?? 0) + data.shares,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickBuy = async (amt: number) => {
    await submitTradePayload("buy", amt, undefined);
  };
  const handleQuickSell = async (sh: number) => {
    await submitTradePayload("sell", undefined, sh);
  };

  const chartData = market.priceHistory.map((p) => ({
    time: new Date(p.timestamp).getTime(),
    price: p.price,
  }));

  const holders = market.positions?.filter((p) => p.shares > 0) ?? [];
  const liquidity =
    market.reserveTokens != null && market.reserveShares != null
      ? market.reserveTokens * market.price + market.reserveShares * market.price
      : null;

  const unrealizedPnL =
    position && position.shares > 0 && position.avgPrice != null
      ? (market.price - position.avgPrice) * position.shares
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-0">
      <Link
        href="/"
        className="mb-6 inline-flex min-h-[44px] min-w-[44px] items-center gap-2 text-sm text-slate-500 transition-colors hover:text-emerald-400 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>

      {/* Mobile QuickTrade */}
      {user && (
        <div className="mb-6 md:hidden">
          <QuickTrade
            marketId={market.id}
            canonical={market.canonical}
            displayName={market.displayName}
            price={market.price}
            userBalance={user.balance}
            positionShares={position?.shares ?? 0}
            onBuy={handleQuickBuy}
            onSell={handleQuickSell}
            loading={loading}
            error={error}
            triggerSellMax={triggerSellMax}
            onTriggerSellMaxConsumed={() => setTriggerSellMax(null)}
          />
        </div>
      )}

      {/* Market Header: name text-3xl font-semibold text-slate-100, canonical # text-sm text-slate-500, stats row */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-100 md:text-3xl">
            {market.displayName}
          </h1>
          <p className="mt-1 text-sm text-slate-500" title="Canonical market ID">
            #{market.canonical}
          </p>
        </div>
        <ChaotixButton
          type="button"
          variant="secondary"
          className="min-h-[44px] min-w-[44px] shrink-0"
          onClick={() => {
            const url = typeof window !== "undefined" ? window.location.href : "";
            navigator.clipboard?.writeText(url).then(() => {
              setShareCopied(true);
              setTimeout(() => setShareCopied(false), 2000);
            });
          }}
        >
          <Share2 className="mr-2 h-4 w-4 shrink-0" strokeWidth={1.5} />
          {shareCopied ? "Copied!" : "Share"}
        </ChaotixButton>
      </div>

      {/* Stats row: volume, traders, liquidity in ChaotixCard or flex */}
      <div className="mb-6 flex flex-wrap gap-4">
        <ChaotixCard as="div" className="flex flex-1 min-w-0 items-center gap-3 p-4">
          <Droplets className="h-5 w-5 shrink-0 text-slate-500" strokeWidth={1.5} />
          <div>
            <p className="text-xs text-slate-500">Volume</p>
            <p className="font-mono text-sm text-slate-100">${market.volume.toFixed(0)}</p>
          </div>
        </ChaotixCard>
        <ChaotixCard as="div" className="flex flex-1 min-w-0 items-center gap-3 p-4">
          <Activity className="h-5 w-5 shrink-0 text-slate-500" strokeWidth={1.5} />
          <div>
            <p className="text-xs text-slate-500">Trades</p>
            <p className="font-mono text-sm text-slate-100">{market.tradeCount}</p>
          </div>
        </ChaotixCard>
        {liquidity != null && (
          <ChaotixCard as="div" className="flex flex-1 min-w-0 items-center gap-3 p-4">
            <TrendingUp className="h-5 w-5 shrink-0 text-slate-500" strokeWidth={1.5} />
            <div>
              <p className="text-xs text-slate-500">Liquidity</p>
              <p className="font-mono text-sm text-slate-100">~{(liquidity / 2).toFixed(0)}</p>
            </div>
          </ChaotixCard>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Price + Chart: ChaotixCard p-4, Recharts emerald-500, period selector */}
          <ChaotixCard as="div" className="p-4">
            <div className="mb-2 flex items-center justify-between gap-4">
              <h3 className="text-sm font-medium text-slate-400">Price</h3>
              {liquidityStatus && (
                <span
                  className={`text-xs font-medium ${
                    liquidityStatus === "healthy"
                      ? "text-emerald-400"
                      : liquidityStatus === "thin"
                      ? "text-amber-400"
                      : "text-chaos-tradeDown"
                  }`}
                >
                  {liquidityStatus === "healthy" ? "Healthy" : liquidityStatus === "thin" ? "Thin" : "Risky"}
                </span>
              )}
            </div>
            <p
              className={`text-3xl font-mono font-semibold text-emerald-400 transition-opacity duration-300 ${
                priceJustUpdated ? "animate-pulse" : ""
              }`}
              title="Current price"
            >
              ${market.price.toFixed(4)}
            </p>
            {chartData.length > 0 && (
              <>
                <div className="mt-4 overflow-x-auto">
                  <div className="flex flex-nowrap gap-2 pb-1">
                    {CHART_PERIODS.map((p) => (
                      <ChaotixButton
                        key={p}
                        type="button"
                        variant={chartPeriod === p ? "primary" : "ghost"}
                        className="min-h-[44px] shrink-0 px-4 py-2 text-xs"
                        onClick={() => setChartPeriod(p)}
                      >
                        {p}
                      </ChaotixButton>
                    ))}
                  </div>
                </div>
                <div className="mt-4 min-h-[200px] h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient
                          id="priceGradientMarket"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="time"
                        type="number"
                        domain={["dataMin", "dataMax"]}
                        tickFormatter={(t) =>
                          new Date(t).toLocaleTimeString(undefined, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        }
                        stroke="#64748b"
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        tickFormatter={(v) => `$${v.toFixed(3)}`}
                        stroke="#64748b"
                      />
                      <Tooltip
                        formatter={(v: number) => [`$${v.toFixed(4)}`, "Price"]}
                        labelFormatter={(t) => new Date(t).toLocaleString()}
                        contentStyle={{
                          backgroundColor: "#0B0F1A",
                          border: "1px solid rgba(255,255,255,0.1)",
                          borderRadius: "8px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="price"
                        stroke="#10b981"
                        strokeWidth={2}
                        fill="url(#priceGradientMarket)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </ChaotixCard>

          {/* Recent Trades: ChaotixCard list with border-white/5 dividers, text-xs text-slate-500 timestamp */}
          <ChaotixCard as="div" className="p-4">
            <h3 className="mb-4 text-sm font-medium text-slate-400">Recent trades</h3>
            {market.recentTrades?.length === 0 ? (
              <p className="text-sm text-slate-500">No trades yet.</p>
            ) : (
              <div className="max-h-64 space-y-0 overflow-auto">
                {market.recentTrades?.slice(0, 20).map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-white/5 px-3 py-3 text-sm last:border-b-0 md:flex-nowrap md:justify-between"
                  >
                    <span
                      className={
                        t.side === "buy" ? "text-emerald-400 font-medium" : "text-chaos-tradeDown font-medium"
                      }
                    >
                      {t.side.toUpperCase()}
                    </span>
                    <span className="font-mono text-slate-100">{t.shares.toFixed(2)}</span>
                    <span className="text-slate-400">@ ${t.price.toFixed(4)}</span>
                    <span className="text-slate-500 truncate max-w-[120px] md:max-w-[100px] order-last w-full md:order-none md:w-auto">
                      {t.user?.name || t.user?.email || "—"}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(t.createdAt).toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ChaotixCard>

          {/* Comments */}
          <ChaotixCard as="div" className="p-4">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-400">
              <MessageSquare className="h-4 w-4" strokeWidth={1.5} />
              Comments
            </h3>
            {comments.length === 0 ? (
              <p className="text-sm text-slate-500">No comments yet.</p>
            ) : (
              <div className="space-y-0 max-h-64 overflow-auto">
                {comments.slice(0, 20).map((c) => (
                  <div
                    key={c.id}
                    className="border-b border-white/5 px-3 py-3 last:border-b-0"
                  >
                    <p className="text-sm text-slate-300">{c.body}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {c.user?.name || c.user?.email || "—"} ·{" "}
                      {new Date(c.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ChaotixCard>
        </div>

        <div className="space-y-6">
          {/* Desktop QuickTrade (same component) */}
          <div className="hidden md:block">
            {user ? (
              <QuickTrade
                marketId={market.id}
                canonical={market.canonical}
                displayName={market.displayName}
                price={market.price}
                userBalance={user.balance}
                positionShares={position?.shares ?? 0}
                onBuy={handleQuickBuy}
                onSell={handleQuickSell}
                loading={loading}
                error={error}
                triggerSellMax={triggerSellMax}
                onTriggerSellMaxConsumed={() => setTriggerSellMax(null)}
              />
            ) : (
              <ChaotixCard as="div" className="p-6">
                <p className="text-center text-sm text-slate-500">
                  Log in to trade.
                </p>
              </ChaotixCard>
            )}
          </div>

          <LiquidityPanel
            canonical={market.canonical}
            marketId={market.id}
            onRefresh={refreshMarket}
          />

          {/* User Position Card: ChaotixCard p-4 when user has shares */}
          {user && position && position.shares > 0 && (
            <ChaotixCard as="div" className="p-4">
              <h3 className="mb-3 text-sm font-medium text-slate-400">Your position</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Shares</span>
                  <span className="font-mono text-slate-100">{position.shares.toFixed(4)}</span>
                </div>
                {position.avgPrice != null && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Avg price</span>
                    <span className="font-mono text-slate-100">${position.avgPrice.toFixed(4)}</span>
                  </div>
                )}
                {unrealizedPnL != null && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Unrealized PnL</span>
                    <span
                      className={`font-mono ${
                        unrealizedPnL >= 0 ? "text-emerald-400" : "text-chaos-tradeDown"
                      }`}
                    >
                      {unrealizedPnL >= 0 ? "+" : ""}
                      {unrealizedPnL.toFixed(2)}
                    </span>
                  </div>
                )}
              </dl>
              <ChaotixButton
                type="button"
                variant="secondary"
                className="mt-4 h-9 w-full text-sm"
                onClick={() => setTriggerSellMax(position.shares)}
              >
                Sell
              </ChaotixButton>
            </ChaotixCard>
          )}

          {/* Stats & Holders */}
          <ChaotixCard as="div" className="p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-400">
              <Users className="h-4 w-4" strokeWidth={1.5} /> Holders
            </h3>
            {holders.length === 0 ? (
              <p className="text-sm text-slate-500">No holders yet.</p>
            ) : (
              <div className="max-h-48 space-y-0 overflow-auto">
                {holders.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between border-b border-white/5 px-3 py-2 text-sm last:border-b-0"
                  >
                    <span className="truncate text-slate-400">
                      {p.user?.name || p.user?.email || "Anon"}
                    </span>
                    <span className="shrink-0 font-mono text-emerald-400">
                      {p.shares.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ChaotixCard>
        </div>
      </div>
    </div>
  );
}
