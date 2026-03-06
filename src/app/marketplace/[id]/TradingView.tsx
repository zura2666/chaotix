"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { ChaotixButton } from "@/components/ui/ChaotixButton";
import { Droplets, Star, User, BookOpen, Share2, MessageCircle, Bell } from "lucide-react";
import { FollowCreatorButton } from "@/components/marketplace/FollowCreatorButton";
import { OrderBook as ProfessionalOrderBook } from "@/components/marketplace/OrderBook";
import { useMarketSocket } from "@/hooks/useMarketSocket";

type Asset = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  currentPrice: number;
  marketCap: number;
  liquidityScore: number;
  demandScore: number;
  verificationStatus: string;
  totalSupply: number;
  supplyModel: string;
  commentCount?: number;
  shareCount?: number;
  communitySentimentScore?: number;
  creator: { id: string; name: string | null; username: string | null };
};

type OrderBookLevel = { price: number; quantity: number };
type OrderBook = {
  lowestAsk: number | null;
  highestBid: number | null;
  asks: OrderBookLevel[];
  bids: OrderBookLevel[];
  spread?: number | null;
};

type LiquidityIndicators = {
  liquidityScore: number;
  demandScore: number;
  volume24h: number;
  activeTraders24h: number;
  spread: number | null;
  orderBookDepth: number;
};

type OpenOrder = {
  id: string;
  quantity: number;
  unitPrice: number;
  asset?: { id: string; title: string };
};

export function TradingView({ asset }: { asset: Asset }) {
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [priceHistory, setPriceHistory] = useState<{ timestamp: string; price: number }[]>([]);
  const [trades, setTrades] = useState<{ id: string; quantity: number; unitPrice: number; createdAt: string }[]>([]);
  const [liquidity, setLiquidity] = useState<LiquidityIndicators | null>(null);
  const [watchlisted, setWatchlisted] = useState(false);
  const [holding, setHolding] = useState<number | null>(null);
  const [openOrders, setOpenOrders] = useState<{ listings: OpenOrder[]; bids: OpenOrder[] }>({ listings: [], bids: [] });
  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(asset.currentPrice);

  const { liveOrderBook, newTrades, livePricePoint, isConnected } = useMarketSocket(asset.id);

  useEffect(() => {
    if (liveOrderBook) setOrderBook(liveOrderBook);
  }, [liveOrderBook]);

  useEffect(() => {
    if (newTrades && newTrades.length > 0) {
      setTrades((prev) => {
        const existingIds = new Set(prev.map(t => t.id));
        const novel = newTrades.filter(t => !existingIds.has(t.id));
        return [...novel, ...prev].slice(0, 50);
      });
    }
  }, [newTrades]);

  useEffect(() => {
    if (livePricePoint) {
      setCurrentPrice(livePricePoint.price);
      setPriceHistory((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.timestamp === livePricePoint.timestamp) return prev;
        return [...prev, livePricePoint];
      });
    }
  }, [livePricePoint]);
  const [buyQty, setBuyQty] = useState("");
  const [sellQty, setSellQty] = useState("");
  const [askPrice, setAskPrice] = useState("");
  const [askQty, setAskQty] = useState("");
  const [bidPrice, setBidPrice] = useState("");
  const [bidQty, setBidQty] = useState("");
  const [action, setAction] = useState<"buy" | "sell" | "ask" | "bid" | "cancel" | null>(null);
  const [error, setError] = useState("");
  const [comments, setComments] = useState<{ id: string; body: string; createdAt: string; user: { id: string; name: string | null; username: string | null } }[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertDirection, setAlertDirection] = useState<"above" | "below">("above");
  const [alertThreshold, setAlertThreshold] = useState("");
  const [alertLoading, setAlertLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!asset.id) return;
    setLoading(true);
    try {
      const [obRes, histRes, tradesRes, liqRes, holdRes, ordersRes, watchRes, commentsRes] = await Promise.all([
        fetch(`/api/trading/orderbook/${asset.id}`),
        fetch(`/api/marketplace/assets/${asset.id}/price-history`),
        fetch(`/api/marketplace/assets/${asset.id}/trades`),
        fetch(`/api/marketplace/assets/${asset.id}/liquidity`),
        fetch(`/api/marketplace/assets/${asset.id}/holding`).catch(() => ({ json: () => ({ quantity: 0 }) })),
        fetch(`/api/marketplace/me/orders?assetId=${asset.id}`).catch(() => ({ json: () => ({ listings: [], bids: [] }) })),
        fetch("/api/marketplace/watchlist").catch(() => ({ json: () => ({ assetIds: [] }) })),
        fetch(`/api/marketplace/assets/${asset.id}/comments`).catch(() => ({ json: () => ({ comments: [] }) })),
      ]);
      const ob = await obRes.json();
      const hist = await histRes.json();
      const tr = await tradesRes.json();
      const liq = await liqRes.json();
      const hold = await holdRes.json();
      const orders = await ordersRes.json();
      const watch = await watchRes.json();
      setOrderBook(ob);
      setPriceHistory(hist.history ?? []);
      setTrades(tr.trades ?? []);
      setLiquidity(liq.liquidityScore !== undefined ? liq : null);
      setHolding(hold.quantity ?? 0);
      setOpenOrders({ listings: orders.listings ?? [], bids: orders.bids ?? [] });
      setWatchlisted(Array.isArray(watch.assetIds) && watch.assetIds.includes(asset.id));
      const commentsData = await commentsRes.json();
      setComments(commentsData.comments ?? []);
    } finally {
      setLoading(false);
    }
  }, [asset.id]);

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 15000);
    return () => clearInterval(t);
  }, [fetchData]);

  const handleMarketBuy = async () => {
    const q = parseFloat(buyQty);
    if (!Number.isFinite(q) || q <= 0) {
      setError("Enter a valid quantity");
      return;
    }
    setError("");
    setAction("buy");
    try {
      const res = await fetch(`/api/trading/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: asset.id, type: "buy", orderType: "market", quantity: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Buy failed");
        return;
      }
      setBuyQty("");
      await fetchData();
    } finally {
      setAction(null);
    }
  };

  const handleMarketSell = async () => {
    const q = parseFloat(sellQty);
    if (!Number.isFinite(q) || q <= 0) {
      setError("Enter a valid quantity");
      return;
    }
    setError("");
    setAction("sell");
    try {
      const res = await fetch(`/api/trading/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: asset.id, type: "sell", orderType: "market", quantity: q }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Sell failed");
        return;
      }
      setSellQty("");
      await fetchData();
    } finally {
      setAction(null);
    }
  };

  const handlePlaceAsk = async () => {
    const q = parseFloat(askQty);
    const p = parseFloat(askPrice);
    if (!Number.isFinite(q) || q <= 0 || !Number.isFinite(p) || p <= 0) {
      setError("Enter valid quantity and price");
      return;
    }
    setError("");
    setAction("ask");
    try {
      const res = await fetch(`/api/trading/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: asset.id, type: "sell", orderType: "limit", quantity: q, price: p }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Listing failed");
        return;
      }
      setAskQty("");
      setAskPrice("");
      await fetchData();
    } finally {
      setAction(null);
    }
  };

  const handlePlaceBid = async () => {
    const q = parseFloat(bidQty);
    const p = parseFloat(bidPrice);
    if (!Number.isFinite(q) || q <= 0 || !Number.isFinite(p) || p <= 0) {
      setError("Enter valid quantity and price");
      return;
    }
    setError("");
    setAction("bid");
    try {
      const res = await fetch(`/api/trading/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: asset.id, type: "buy", orderType: "limit", quantity: q, price: p }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Bid failed");
        return;
      }
      setBidQty("");
      setBidPrice("");
      await fetchData();
    } finally {
      setAction(null);
    }
  };

  const toggleWatchlist = async () => {
    try {
      if (watchlisted) {
        await fetch(`/api/marketplace/watchlist?assetId=${asset.id}`, { method: "DELETE" });
        setWatchlisted(false);
      } else {
        await fetch("/api/marketplace/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ assetId: asset.id }),
        });
        setWatchlisted(true);
      }
    } catch {
      setError("Watchlist update failed");
    }
  };

  const cancelOrder = async (orderId: string) => {
    setAction("cancel");
    try {
      const res = await fetch(`/api/trading/order/${orderId}/cancel`, { method: "POST" });
      if (res.ok) await fetchData();
      else setError("Failed to cancel order");
    } finally {
      setAction(null);
    }
  };

  const chartData = priceHistory.map((h) => ({
    time: new Date(h.timestamp).getTime(),
    price: h.price,
    label: new Date(h.timestamp).toLocaleString(),
  }));

  return (
    <div className="space-y-6">
      {/* Header + watchlist */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{asset.title}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{asset.category}</p>
          {asset.description && (
            <p className="mt-2 text-sm text-slate-400 line-clamp-2">{asset.description}</p>
          )}
          <p className="mt-2 text-xs text-slate-500">
            by <FollowCreatorButton creatorId={asset.creator.id} creatorUsername={asset.creator.username} creatorName={asset.creator.name} /> · {asset.supplyModel} supply
            {asset.totalSupply > 0 && ` · ${asset.totalSupply.toFixed(0)} circulating`}
            {(asset.commentCount ?? 0) > 0 && (
              <> · <span className="text-slate-400">{asset.commentCount} comments</span></>
            )}
            {(asset.shareCount ?? 0) > 0 && (
              <> · <span className="text-slate-400">{asset.shareCount} shares</span></>
            )}
            {typeof asset.communitySentimentScore === "number" && asset.communitySentimentScore !== 50 && (
              <> · <span className="text-slate-400">Sentiment {Math.round(asset.communitySentimentScore)}</span></>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ChaotixButton
            variant="ghost"
            onClick={toggleWatchlist}
            className={watchlisted ? "text-amber-400" : ""}
            title={watchlisted ? "Remove from watchlist" : "Add to watchlist"}
          >
            <Star className={`h-5 w-5 ${watchlisted ? "fill-current" : ""}`} />
            {watchlisted ? "Watching" : "Watch"}
          </ChaotixButton>
          <ChaotixButton
            variant="ghost"
            onClick={async () => {
              try {
                await fetch(`/api/marketplace/assets/${asset.id}/share`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
                if (typeof navigator !== "undefined" && navigator.share) {
                  await navigator.share({ title: asset.title, url: window.location.href, text: `Check out ${asset.title} on Chaotix` });
                } else {
                  await navigator.clipboard?.writeText(window.location.href);
                }
              } catch {
                // ignore
              }
            }}
            title="Share"
          >
            <Share2 className="h-5 w-5" /> Share
          </ChaotixButton>
          <ChaotixButton variant="ghost" onClick={() => setAlertOpen(!alertOpen)} title="Price alert">
            <Bell className="h-5 w-5" /> Alert
          </ChaotixButton>
          <Link href="/marketplace/portfolio">
            <ChaotixButton variant="ghost">
              <User className="h-5 w-5" /> Portfolio
            </ChaotixButton>
          </Link>
        </div>
      </div>

      {alertOpen && (
        <ChaotixCard as="div" className="p-4">
          <p className="mb-2 text-sm text-slate-400">Get notified when price goes:</p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={alertDirection}
              onChange={(e) => setAlertDirection(e.target.value as "above" | "below")}
              className="rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
            >
              <option value="above">Above</option>
              <option value="below">Below</option>
            </select>
            <input
              type="number"
              step="any"
              placeholder="Price"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(e.target.value)}
              className="w-24 rounded border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white"
            />
            <ChaotixButton
              disabled={!alertThreshold || alertLoading}
              onClick={async () => {
                const t = parseFloat(alertThreshold);
                if (!Number.isFinite(t)) return;
                setAlertLoading(true);
                try {
                  await fetch("/api/marketplace/alerts", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ assetId: asset.id, direction: alertDirection, threshold: t }),
                  });
                  setAlertOpen(false);
                  setAlertThreshold("");
                } finally {
                  setAlertLoading(false);
                }
              }}
            >
              {alertLoading ? "…" : "Set alert"}
            </ChaotixButton>
          </div>
        </ChaotixCard>
      )}

      {/* Liquidity indicators */}
      {liquidity != null && (
        <ChaotixCard as="div" className="flex flex-wrap items-center gap-6 p-4">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-slate-400" />
            <span className="text-sm text-slate-400">Liquidity</span>
            <span className={`font-mono font-bold ${liquidity.liquidityScore >= 50 ? "text-emerald-400" : liquidity.liquidityScore >= 20 ? "text-amber-400" : "text-slate-400"}`}>
              {liquidity.liquidityScore}/100
            </span>
          </div>
          <div className="text-sm text-slate-500">
            Vol 24h: <span className="text-slate-300">{liquidity.volume24h.toFixed(0)}</span>
          </div>
          <div className="text-sm text-slate-500">
            Traders 24h: <span className="text-slate-300">{liquidity.activeTraders24h}</span>
          </div>
          <div className="text-sm text-slate-500">
            Depth: <span className="text-slate-300">{liquidity.orderBookDepth.toFixed(0)}</span>
          </div>
          {liquidity.spread != null && (
            <div className="text-sm text-slate-500">
              Spread: <span className="text-slate-300">{liquidity.spread.toFixed(2)}</span>
            </div>
          )}
        </ChaotixCard>
      )}

      {/* Price + order book summary + holding */}
      <div className="grid gap-4 md:grid-cols-4">
        <ChaotixCard as="div" className="p-4">
          <p className="text-xs text-slate-500">Market price {isConnected ? <span className="text-emerald-400 text-[10px] uppercase ml-1 tracking-wider border border-emerald-400/20 px-1 rounded bg-emerald-400/10">Live</span> : null}</p>
          <p className="text-2xl font-mono font-bold text-white">
            {currentPrice > 0 ? currentPrice.toFixed(2) : "—"}
          </p>
        </ChaotixCard>
        <ChaotixCard as="div" className="p-4">
          <p className="text-xs text-slate-500">Lowest ask (sell)</p>
          <p className="text-2xl font-mono font-bold text-emerald-400">
            {orderBook?.lowestAsk != null ? orderBook.lowestAsk.toFixed(2) : "—"}
          </p>
        </ChaotixCard>
        <ChaotixCard as="div" className="p-4">
          <p className="text-xs text-slate-500">Highest bid (buy)</p>
          <p className="text-2xl font-mono font-bold text-amber-400">
            {orderBook?.highestBid != null ? orderBook.highestBid.toFixed(2) : "—"}
          </p>
        </ChaotixCard>
        <ChaotixCard as="div" className="p-4">
          <p className="text-xs text-slate-500">Your balance</p>
          <p className="text-2xl font-mono font-bold text-white">
            {holding != null ? holding.toFixed(2) : "—"}
          </p>
        </ChaotixCard>
      </div>

      {error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart */}
        <div className="lg:col-span-2">
          <ChaotixCard as="div" className="p-4">
            <h2 className="mb-4 text-sm font-medium text-slate-400">Price history</h2>
            {loading && chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-500 text-sm">Loading…</div>
            ) : chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-slate-500 text-sm">No trades yet. Price will appear after first trade.</div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <defs>
                      <linearGradient id="assetPriceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="time"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={(t) => new Date(t).toLocaleDateString()}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tickFormatter={(v) => v.toFixed(2)}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(v: number) => [v.toFixed(2), "Price"]}
                      labelFormatter={(t) => (typeof t === "number" ? new Date(t).toLocaleString() : t)}
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#assetPriceGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </ChaotixCard>
        </div>

        {/* Order book + depth */}
        <ChaotixCard as="div" className="p-4">
          {loading && !orderBook ? (
            <p className="text-slate-500 text-sm">Loading…</p>
          ) : (
            <ProfessionalOrderBook
              bids={(orderBook?.bids as { price: number; quantity: number; cumulative?: number }[]) ?? []}
              asks={(orderBook?.asks as { price: number; quantity: number; cumulative?: number }[]) ?? []}
              highestBid={orderBook?.highestBid ?? null}
              lowestAsk={orderBook?.lowestAsk ?? null}
              spread={("spread" in (orderBook ?? {}) ? (orderBook as { spread?: number | null }).spread ?? null : null)}
              maxLevels={12}
            />
          )}
        </ChaotixCard>
      </div>

      {/* Your open orders (limit orders) */}
      {(openOrders.listings.length > 0 || openOrders.bids.length > 0) && (
        <ChaotixCard as="div" className="p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-400">
            <BookOpen className="h-4 w-4" /> Your open orders
          </h2>
          <div className="flex flex-wrap gap-4">
            {openOrders.listings.map((l) => (
              <div key={l.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm">
                <span className="text-emerald-400">Ask {l.unitPrice.toFixed(2)} × {l.quantity.toFixed(0)}</span>
                <ChaotixButton variant="ghost" onClick={() => cancelOrder(l.id)} disabled={action === "cancel"}>
                  Cancel
                </ChaotixButton>
              </div>
            ))}
            {openOrders.bids.map((b) => (
              <div key={b.id} className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm">
                <span className="text-amber-400">Bid {b.unitPrice.toFixed(2)} × {b.quantity.toFixed(0)}</span>
                <ChaotixButton variant="ghost" onClick={() => cancelOrder(b.id)} disabled={action === "cancel"}>
                  Cancel
                </ChaotixButton>
              </div>
            ))}
          </div>
        </ChaotixCard>
      )}

      {/* Buy / Sell panel */}
      <ChaotixCard as="div" className="p-6">
        <h2 className="mb-4 text-sm font-medium text-slate-400">Buy / Sell</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-500">Market buy (hit lowest ask)</label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Qty"
              value={buyQty}
              onChange={(e) => setBuyQty(e.target.value)}
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
            />
            <ChaotixButton
              onClick={handleMarketBuy}
              disabled={action === "buy" || !buyQty}
              variant="primary"
              className="w-full"
            >
              {action === "buy" ? "…" : "Buy"}
            </ChaotixButton>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-slate-500">Market sell (hit highest bid)</label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Qty"
              value={sellQty}
              onChange={(e) => setSellQty(e.target.value)}
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
            />
            <ChaotixButton
              onClick={handleMarketSell}
              disabled={action === "sell" || !sellQty}
              variant="secondary"
              className="w-full"
            >
              {action === "sell" ? "…" : "Sell"}
            </ChaotixButton>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-slate-500">Place ask (list for sale)</label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Price"
              value={askPrice}
              onChange={(e) => setAskPrice(e.target.value)}
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
            />
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Qty"
              value={askQty}
              onChange={(e) => setAskQty(e.target.value)}
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
            />
            <ChaotixButton
              onClick={handlePlaceAsk}
              disabled={action === "ask" || !askPrice || !askQty}
              variant="ghost"
              className="w-full"
            >
              {action === "ask" ? "…" : "Place ask"}
            </ChaotixButton>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-slate-500">Place bid</label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Price"
              value={bidPrice}
              onChange={(e) => setBidPrice(e.target.value)}
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
            />
            <input
              type="number"
              min="0"
              step="any"
              placeholder="Qty"
              value={bidQty}
              onChange={(e) => setBidQty(e.target.value)}
              className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
            />
            <ChaotixButton
              onClick={handlePlaceBid}
              disabled={action === "bid" || !bidPrice || !bidQty}
              variant="ghost"
              className="w-full"
            >
              {action === "bid" ? "…" : "Place bid"}
            </ChaotixButton>
          </div>
        </div>
      </ChaotixCard>

      {/* Comments */}
      <ChaotixCard as="div" className="p-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-400">
          <MessageCircle className="h-4 w-4" /> Discussion ({comments.length})
        </h2>
        <div className="space-y-3">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!commentBody.trim() || commentLoading) return;
              setCommentLoading(true);
              try {
                const res = await fetch(`/api/marketplace/assets/${asset.id}/comments`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ body: commentBody.trim() }),
                });
                const data = await res.json();
                if (res.ok && data.id) {
                  setComments((c) => [...c, { id: data.id, body: data.body, createdAt: data.createdAt, user: data.user }]);
                  setCommentBody("");
                }
              } finally {
                setCommentLoading(false);
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Add a comment…"
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              maxLength={2000}
              className="flex-1 rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500/50 focus:outline-none"
            />
            <ChaotixButton type="submit" disabled={!commentBody.trim() || commentLoading}>
              {commentLoading ? "…" : "Post"}
            </ChaotixButton>
          </form>
          <div className="max-h-48 space-y-2 overflow-auto">
            {comments.length === 0 ? (
              <p className="text-sm text-slate-500">No comments yet.</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="rounded-lg bg-white/5 px-3 py-2 text-sm">
                  <p className="text-slate-300">{c.body}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {c.user?.name || c.user?.username || "Unknown"} · {new Date(c.createdAt).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </ChaotixCard>

      {/* Recent trades */}
      <ChaotixCard as="div" className="p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-400">Recent trades</h2>
        {trades.length === 0 ? (
          <p className="text-sm text-slate-500">No trades yet.</p>
        ) : (
          <div className="max-h-48 space-y-0 overflow-auto">
            {trades.slice(0, 20).map((t) => (
              <div
                key={t.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 py-2 text-sm last:border-b-0"
              >
                <span className="font-mono text-emerald-400">{t.unitPrice.toFixed(2)}</span>
                <span className="text-slate-400">{t.quantity.toFixed(2)}</span>
                <span className="text-slate-500 text-xs">
                  {new Date(t.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </ChaotixCard>
    </div>
  );
}
