"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { TrendingUp, Zap, BarChart3, Activity, Sparkles } from "lucide-react";

const SORTS = [
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "rising", label: "Rising", icon: Zap },
  { id: "trades", label: "Most traded", icon: Activity },
  { id: "volume", label: "Highest volume", icon: BarChart3 },
  { id: "new", label: "Newly popular", icon: Sparkles },
] as const;

const REFRESH_MS = 2 * 60 * 1000;

type AssetRow = {
  id: string;
  title: string;
  category: string;
  currentPrice: number;
  trendingScore?: number;
  demandScore?: number;
  volume24h?: number;
  tradeCount24h?: number;
  priceChange24h?: number;
  viewCount24h?: number;
  watcherCount?: number;
  createdAt?: string;
};

export function MarketplaceRankings() {
  const [sort, setSort] = useState<(typeof SORTS)[number]["id"]>("trending");
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRankings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/marketplace/rankings?sort=${sort}&limit=15`);
      const data = await res.json();
      setAssets(Array.isArray(data.assets) ? data.assets : []);
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    fetchRankings();
    const t = setInterval(fetchRankings, REFRESH_MS);
    return () => clearInterval(t);
  }, [fetchRankings]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Discover</h2>
      <p className="text-sm text-slate-400">
        Demand & hype signals. Rankings update every few minutes.
      </p>
      <div className="flex flex-wrap gap-2">
        {SORTS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSort(s.id)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                sort === s.id
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              <Icon className="h-4 w-4" />
              {s.label}
            </button>
          );
        })}
      </div>
      {loading && assets.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-slate-900/40 p-8 text-center text-slate-500 text-sm">
          Loading…
        </div>
      ) : assets.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-slate-900/40 p-8 text-center text-slate-500 text-sm">
          No assets in this ranking yet. Rankings refresh after demand signals (views, trades, bids).
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {assets.map((a) => (
            <li key={a.id}>
              <Link href={`/marketplace/${a.id}`}>
                <ChaotixCard as="div" className="p-4 transition-colors hover:border-emerald-500/30">
                  <h3 className="font-semibold text-white truncate">{a.title}</h3>
                  <p className="mt-0.5 text-xs text-slate-500">{a.category}</p>
                  <p className="mt-2 text-lg font-mono text-emerald-400">
                    {a.currentPrice > 0 ? a.currentPrice.toFixed(2) : "—"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                    {a.trendingScore != null && (
                      <span title="Trending score">🔥 {Math.round(a.trendingScore)}</span>
                    )}
                    {a.demandScore != null && (
                      <span title="Demand score">📈 {Math.round(a.demandScore)}</span>
                    )}
                    {a.priceChange24h != null && a.priceChange24h !== 0 && (
                      <span className={a.priceChange24h > 0 ? "text-emerald-400" : "text-red-400"}>
                        {(a.priceChange24h * 100).toFixed(1)}% 24h
                      </span>
                    )}
                    {a.volume24h != null && a.volume24h > 0 && (
                      <span>Vol {a.volume24h.toFixed(0)}</span>
                    )}
                    {a.tradeCount24h != null && a.tradeCount24h > 0 && (
                      <span>{a.tradeCount24h} trades</span>
                    )}
                    {a.watcherCount != null && a.watcherCount > 0 && (
                      <span>👀 {a.watcherCount}</span>
                    )}
                  </div>
                </ChaotixCard>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
