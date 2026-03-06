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
  HelpCircle,
  Zap,
  Rss,
  ThumbsUp,
  Lightbulb,
} from "lucide-react";
import { LiquidityPanel } from "@/components/LiquidityPanel";
import { QuickTrade } from "@/components/QuickTrade";
import { NarrativePostCard } from "@/components/NarrativePostCard";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { ChaotixButton } from "@/components/ui/ChaotixButton";
import { NSI_TOOLTIP, NSI_SCALE_SHORT } from "@/lib/narrative-strength";

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
type RelatedMarket = {
  id: string;
  canonical: string;
  displayName: string;
  price: number;
  volume: number;
  tradeCount: number;
};
type NarrativeEvent = {
  id: string;
  title: string;
  description?: string | null;
  source?: string | null;
  timestamp: string;
  impactScore: number;
  reactionCount: number;
};
type MarketPost = {
  id: string;
  userId: string;
  marketId: string;
  content: string;
  likes: number;
  tradeId: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null };
  trade: {
    id: string;
    side: string;
    shares: number;
    price: number;
    createdAt: string;
  } | null;
};
type Market = {
  id: string;
  canonical: string;
  displayName: string;
  title?: string | null;
  description?: string | null;
  price: number;
  volume: number;
  tradeCount: number;
  reserveTokens?: number;
  reserveShares?: number;
  narrativeScore?: number | null;
  attentionVelocity?: number | null;
  uniqueTraders24h?: number | null;
  socialMomentum?: number | null;
  volumeAcceleration?: number | null;
  priceChange24h?: number | null;
  positions: Position[];
  priceHistory: PricePoint[];
  recentTrades: Trade[];
  relatedMarkets?: RelatedMarket[];
  narrativeEvents?: NarrativeEvent[];
  postsTop?: MarketPost[];
  postsRecent?: MarketPost[];
  postsInsights?: MarketPost[];
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
  const [liquidityStatus, setLiquidityStatus] = useState<"healthy" | "thin" | "critical" | null>(null);
  const [triggerSellMax, setTriggerSellMax] = useState<number | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("1D");
  const [priceJustUpdated, setPriceJustUpdated] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [postsTop, setPostsTop] = useState<MarketPost[]>(market.postsTop ?? []);
  const [postsRecent, setPostsRecent] = useState<MarketPost[]>(market.postsRecent ?? []);
  const [postsInsights, setPostsInsights] = useState<MarketPost[]>(market.postsInsights ?? []);
  const [postContent, setPostContent] = useState("");
  const [postTradeId, setPostTradeId] = useState<string>("");
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postError, setPostError] = useState("");

  const refreshMarket = useCallback(() => {
    fetch(`/api/markets/${encodeURIComponent(market.canonical)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.market) {
          const prevPrice = market.price;
          setMarket((prev) => ({
            ...d.market,
            relatedMarkets: prev.relatedMarkets ?? d.market.relatedMarkets,
            narrativeEvents: prev.narrativeEvents ?? d.market.narrativeEvents,
          }));
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

  const refreshPosts = useCallback(() => {
    const base = `/api/markets/${encodeURIComponent(market.canonical)}/posts`;
    Promise.all([
      fetch(`${base}?sort=top&limit=10`).then((r) => r.json()).then((d) => setPostsTop(d.posts ?? [])),
      fetch(`${base}?sort=recent&limit=15`).then((r) => r.json()).then((d) => setPostsRecent(d.posts ?? [])),
      fetch(`${base}?sort=insights&limit=10`).then((r) => r.json()).then((d) => setPostsInsights(d.posts ?? [])),
    ]).catch(() => {});
  }, [market.canonical]);

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setPostError("");
    const content = postContent.trim().slice(0, 2000);
    if (!content) {
      setPostError("Write something for the feed.");
      return;
    }
    setPostSubmitting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const csrfMatch = typeof document !== "undefined" ? document.cookie.match(/csrf_token=([^;]+)/) : null;
      if (csrfMatch?.[1]) headers["x-csrf-token"] = decodeURIComponent(csrfMatch[1]);
      const res = await fetch(`/api/markets/${encodeURIComponent(market.canonical)}/posts`, {
        method: "POST",
        headers,
        body: JSON.stringify({ content, tradeId: postTradeId || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPostError(data.error ?? "Failed to post");
        return;
      }
      setPostContent("");
      setPostTradeId("");
      if (data.post) {
        setPostsRecent((prev) => [data.post, ...prev]);
        if (data.post.tradeId) setPostsInsights((prev) => [data.post, ...prev]);
      }
      refreshPosts();
    } finally {
      setPostSubmitting(false);
    }
  };

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

  const nsi = market.narrativeScore ?? market.price;
  const narrativeMomentum = market.priceChange24h ?? 0;

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

      {/* Market Header: name, Narrative Strength, 24h Momentum */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-100 md:text-3xl">
            {market.displayName}
          </h1>
          <p className="mt-1 text-sm text-slate-500" title="Canonical market ID">
            #{market.canonical}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
            <span title={NSI_TOOLTIP}>
              Narrative Strength: <span className="font-mono text-emerald-400">{nsi.toFixed(2)}</span>
            </span>
            <span className={narrativeMomentum >= 0 ? "text-emerald-400" : "text-chaos-tradeDown"}>
              24h Momentum: {narrativeMomentum >= 0 ? "+" : ""}
              {(narrativeMomentum * 100).toFixed(1)}%
            </span>
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
        <ChaotixCard as="div" className="flex flex-1 min-w-0 items-center gap-3 p-4">
          <Droplets className="h-5 w-5 shrink-0 text-slate-500" strokeWidth={1.5} />
          <div>
            <p className="text-xs text-slate-500">Liquidity health</p>
            <p
              className={`text-sm font-medium ${
                liquidityStatus === "healthy"
                  ? "text-emerald-400"
                  : liquidityStatus === "thin"
                  ? "text-amber-400"
                  : liquidityStatus === "critical"
                  ? "text-chaos-tradeDown"
                  : "text-slate-400"
              }`}
              title={liquidityStatus ? "Healthy = sufficient, Thin = moderate, Critical = low liquidity" : "Loading…"}
            >
              {liquidityStatus === "healthy" ? "Healthy" : liquidityStatus === "thin" ? "Thin" : liquidityStatus === "critical" ? "Critical" : "—"}
            </p>
          </div>
        </ChaotixCard>
      </div>

      {market.description && (
        <ChaotixCard as="div" className="mb-6 p-4">
          <h3 className="mb-2 text-sm font-medium text-slate-400">About</h3>
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{market.description}</p>
        </ChaotixCard>
      )}

      {/* NSI derived metrics: attention velocity, narrative momentum, volume acceleration */}
      <div className="mb-6 flex flex-wrap gap-4">
        {(market.attentionVelocity != null || narrativeMomentum !== 0 || market.volumeAcceleration != null) && (
          <>
            {market.attentionVelocity != null && (
              <ChaotixCard as="div" className="flex min-w-0 items-center gap-3 p-4">
                <Activity className="h-5 w-5 shrink-0 text-slate-500" strokeWidth={1.5} />
                <div>
                  <p className="text-xs text-slate-500">Attention velocity</p>
                  <p className="font-mono text-sm text-slate-100">
                    {(market.attentionVelocity * 100).toFixed(2)}%
                  </p>
                </div>
              </ChaotixCard>
            )}
            <ChaotixCard as="div" className="flex min-w-0 items-center gap-3 p-4">
              <TrendingUp className="h-5 w-5 shrink-0 text-slate-500" strokeWidth={1.5} />
              <div>
                <p className="text-xs text-slate-500">Narrative momentum (24h)</p>
                <p
                  className={`font-mono text-sm ${
                    narrativeMomentum > 0 ? "text-emerald-400" : narrativeMomentum < 0 ? "text-chaos-tradeDown" : "text-slate-100"
                  }`}
                >
                  {narrativeMomentum >= 0 ? "+" : ""}
                  {(narrativeMomentum * 100).toFixed(2)}%
                </p>
              </div>
            </ChaotixCard>
            {market.volumeAcceleration != null && (
              <ChaotixCard as="div" className="flex min-w-0 items-center gap-3 p-4">
                <Droplets className="h-5 w-5 shrink-0 text-slate-500" strokeWidth={1.5} />
                <div>
                  <p className="text-xs text-slate-500">Volume acceleration</p>
                  <p className="font-mono text-sm text-slate-100">
                    {(market.volumeAcceleration * 100).toFixed(1)}%
                  </p>
                </div>
              </ChaotixCard>
            )}
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Narrative Strength (NSI) + Chart */}
          <ChaotixCard as="div" className="p-4">
            <div className="mb-2 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium text-slate-400">Narrative Strength</h3>
                <span
                  className="inline-flex shrink-0 text-slate-500 transition-colors hover:text-slate-400"
                  title={`${NSI_TOOLTIP} ${NSI_SCALE_SHORT}`}
                  aria-label="Narrative Strength explanation"
                >
                  <HelpCircle className="h-4 w-4" strokeWidth={1.5} />
                </span>
              </div>
              {liquidityStatus && (
                <span
                  className={`text-xs font-medium ${
                    liquidityStatus === "healthy"
                      ? "text-emerald-400"
                      : liquidityStatus === "thin"
                      ? "text-amber-400"
                      : "text-chaos-tradeDown"
                  }`}
                  title="Liquidity health: Healthy = sufficient, Thin = moderate, Critical = low liquidity / high slippage"
                >
                  Liquidity: {liquidityStatus === "healthy" ? "Healthy" : liquidityStatus === "thin" ? "Thin" : "Critical"}
                </span>
              )}
            </div>
            <p
              className={`text-3xl font-mono font-semibold text-emerald-400 transition-opacity duration-300 ${
                priceJustUpdated ? "animate-pulse" : ""
              }`}
              title={NSI_TOOLTIP}
            >
              {nsi.toFixed(2)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500" title={NSI_SCALE_SHORT}>
              0.00 → irrelevant · 0.25 → niche · 0.50 → moderate · 0.75 → dominant · 1.00 → max
            </p>
            {chartData.length > 0 && (
              <>
                <div className="mt-4 overflow-x-auto">
                  <p className="mb-2 text-xs font-medium text-slate-500">Narrative Strength Over Time</p>
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
                        tickFormatter={(v) => v.toFixed(2)}
                        stroke="#64748b"
                      />
                      <Tooltip
                        formatter={(v: number) => [v.toFixed(2), "Narrative Strength"]}
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

          {/* Narrative Timeline */}
          {market.narrativeEvents && market.narrativeEvents.length > 0 && (
            <ChaotixCard as="div" className="p-4">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-400">
                <Zap className="h-4 w-4" strokeWidth={1.5} />
                {market.displayName} Narrative Timeline
              </h3>
              <div className="space-y-0 max-h-80 overflow-auto">
                {market.narrativeEvents.map((e) => {
                  const impact = e.impactScore;
                  const impactVariant =
                    impact > 0.3 ? "positive" : impact < -0.3 ? "negative" : "neutral";
                  return (
                    <div
                      key={e.id}
                      className="border-b border-white/5 px-3 py-3 last:border-b-0"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                          title={`Impact ${(impact * 100).toFixed(0)}%`}
                          aria-hidden
                          style={{
                            backgroundColor:
                              impactVariant === "positive"
                                ? "var(--emerald-400, #34d399)"
                                : impactVariant === "negative"
                                ? "var(--chaos-tradeDown, #f87171)"
                                : "#94a3b8",
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-200">{e.title}</p>
                          {e.description && (
                            <p className="mt-0.5 text-xs text-slate-500">{e.description}</p>
                          )}
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span>
                              {new Date(e.timestamp).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {e.source && (
                              <span className="text-slate-600">· {e.source}</span>
                            )}
                            {e.reactionCount > 0 && (
                              <span>
                                · {e.reactionCount} reaction{e.reactionCount !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChaotixCard>
          )}

          {/* Narrative Feed */}
          <ChaotixCard as="div" className="p-4">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-400">
              <Rss className="h-4 w-4" strokeWidth={1.5} />
              Narrative Feed
            </h3>
            {user && (
              <form onSubmit={submitPost} className="mb-4">
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Analysis, trade reasoning, or news — e.g. Bought AI at 0.71 — Nvidia earnings tomorrow."
                  className="mb-2 w-full resize-y rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-chaos-primary focus:outline-none"
                  rows={2}
                  maxLength={2000}
                />
                {market.recentTrades?.filter((t) => t.user?.id === user?.id).length ? (
                  <div className="mb-2">
                    <label className="mb-1 block text-xs text-slate-500">Link to a trade (optional — shows as trade card in Trader commentary)</label>
                    <select
                      value={postTradeId}
                      onChange={(e) => setPostTradeId(e.target.value)}
                      className="w-full max-w-xs rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-slate-200 focus:border-chaos-primary focus:outline-none"
                    >
                      <option value="">None</option>
                      {market.recentTrades
                        .filter((t) => t.user?.id === user?.id)
                        .slice(0, 10)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.side} {t.shares.toFixed(2)} @ {t.price.toFixed(2)} — {new Date(t.createdAt).toLocaleString()}
                          </option>
                        ))}
                    </select>
                  </div>
                ) : null}
                {postError && <p className="mb-2 text-xs text-red-400">{postError}</p>}
                <ChaotixButton type="submit" disabled={postSubmitting} size="sm">
                  {postSubmitting ? "Posting…" : "Post to feed"}
                </ChaotixButton>
              </form>
            )}
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <ThumbsUp className="h-3.5 w-3.5" />
                  Top posts
                </h4>
                <div className="max-h-64 space-y-0 overflow-auto">
                  {postsTop.length === 0 ? (
                    <p className="py-2 text-xs text-slate-500">No posts yet.</p>
                  ) : (
                    postsTop.slice(0, 8).map((p) => (
                      <NarrativePostCard
                        key={p.id}
                        content={p.content}
                        userName={p.user?.name ?? p.user?.email ?? null}
                        createdAt={p.createdAt}
                        likes={p.likes}
                        trade={p.trade}
                        showContentAsReason={!!p.trade}
                      />
                    ))
                  )}
                </div>
              </div>
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <Rss className="h-3.5 w-3.5" />
                  Recent posts
                </h4>
                <div className="max-h-64 space-y-0 overflow-auto">
                  {postsRecent.length === 0 ? (
                    <p className="py-2 text-xs text-slate-500">No posts yet.</p>
                  ) : (
                    postsRecent.slice(0, 8).map((p) => (
                      <NarrativePostCard
                        key={p.id}
                        content={p.content}
                        userName={p.user?.name ?? p.user?.email ?? null}
                        createdAt={p.createdAt}
                        likes={p.likes}
                        trade={p.trade}
                        showContentAsReason={!!p.trade}
                      />
                    ))
                  )}
                </div>
              </div>
              <div>
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                  <Lightbulb className="h-3.5 w-3.5" />
                  Trader commentary
                </h4>
                <div className="max-h-64 space-y-0 overflow-auto">
                  {postsInsights.length === 0 ? (
                    <p className="py-2 text-xs text-slate-500">Posts that reference a trade appear here.</p>
                  ) : (
                    postsInsights.slice(0, 8).map((p) => (
                      <NarrativePostCard
                        key={p.id}
                        content={p.content}
                        userName={p.user?.name ?? p.user?.email ?? null}
                        createdAt={p.createdAt}
                        likes={p.likes}
                        trade={p.trade}
                        showContentAsReason={!!p.trade}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
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

      {market.relatedMarkets && market.relatedMarkets.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-lg font-medium text-slate-200">Related markets</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {market.relatedMarkets.map((m) => (
              <Link
                key={m.id}
                href={`/market/${encodeURIComponent(m.canonical)}`}
                className="block rounded-lg border border-white/10 bg-slate-900/50 p-4 transition-colors hover:border-emerald-500/40 hover:bg-slate-800/50 focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                <p className="font-medium text-slate-100 truncate">{m.displayName}</p>
                <p className="mt-1 text-sm font-mono text-emerald-400" title={NSI_TOOLTIP}>Narrative Strength {(m.price).toFixed(2)}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Vol ${m.volume.toFixed(0)} · {m.tradeCount} trades
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
