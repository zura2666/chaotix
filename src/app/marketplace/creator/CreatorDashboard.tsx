"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { BarChart3, Users, TrendingUp, DollarSign } from "lucide-react";

type DashboardData = {
  assets: { id: string; title: string; currentPrice: number; volume24h: number; tradeCount24h: number; demandScore: number; watcherCount: number; priceChange24h: number }[];
  sales: { totalTrades: number; totalQuantity: number };
  demand: { totalTrades: number; totalQuantity: number };
  followers: number;
  pricePerformance: { id: string; title: string; change: number }[];
  totalVolume24h: number;
};

export function CreatorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/marketplace/creator/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <ChaotixCard as="div" className="p-8 text-center text-slate-500">Loading…</ChaotixCard>;
  if (!data) return null;

  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ChaotixCard as="div" className="p-4">
          <div className="flex items-center gap-2 text-slate-400">
            <DollarSign className="h-5 w-5" />
            <span className="text-sm">Sales (as seller)</span>
          </div>
          <p className="mt-2 text-2xl font-mono font-bold text-white">{data.sales.totalTrades}</p>
          <p className="text-xs text-slate-500">trades · {data.sales.totalQuantity.toFixed(0)} qty sold</p>
        </ChaotixCard>
        <ChaotixCard as="div" className="p-4">
          <div className="flex items-center gap-2 text-slate-400">
            <BarChart3 className="h-5 w-5" />
            <span className="text-sm">Demand</span>
          </div>
          <p className="mt-2 text-2xl font-mono font-bold text-white">{data.demand.totalTrades}</p>
          <p className="text-xs text-slate-500">total trades (buy + sell)</p>
        </ChaotixCard>
        <ChaotixCard as="div" className="p-4">
          <div className="flex items-center gap-2 text-slate-400">
            <Users className="h-5 w-5" />
            <span className="text-sm">Followers</span>
          </div>
          <p className="mt-2 text-2xl font-mono font-bold text-white">{data.followers}</p>
        </ChaotixCard>
        <ChaotixCard as="div" className="p-4">
          <div className="flex items-center gap-2 text-slate-400">
            <TrendingUp className="h-5 w-5" />
            <span className="text-sm">Vol 24h</span>
          </div>
          <p className="mt-2 text-2xl font-mono font-bold text-emerald-400">{data.totalVolume24h.toFixed(0)}</p>
        </ChaotixCard>
      </div>

      <ChaotixCard as="div" className="p-4">
        <h2 className="mb-3 text-sm font-medium text-slate-400">Your assets</h2>
        {data.assets.length === 0 ? (
          <p className="text-slate-500">No assets yet.</p>
        ) : (
          <div className="space-y-2">
            {data.assets.map((a) => (
              <Link
                key={a.id}
                href={`/marketplace/${a.id}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-white/5"
              >
                <span className="font-medium text-white">{a.title}</span>
                <span className="text-slate-400">
                  ${a.currentPrice.toFixed(2)} · Vol {a.volume24h.toFixed(0)} · Demand {Math.round(a.demandScore)} · {a.watcherCount} watchers
                  {a.priceChange24h !== 0 && (
                    <span className={a.priceChange24h > 0 ? "text-emerald-400" : "text-red-400"}>
                      {" "}({a.priceChange24h > 0 ? "+" : ""}{(a.priceChange24h * 100).toFixed(1)}%)
                    </span>
                  )}
                </span>
              </Link>
            ))}
          </div>
        )}
      </ChaotixCard>

      {data.pricePerformance.length > 0 && (
        <ChaotixCard as="div" className="p-4">
          <h2 className="mb-3 text-sm font-medium text-slate-400">Price performance (24h)</h2>
          <div className="space-y-2">
            {data.pricePerformance.map((p) => (
              <div key={p.id} className="flex justify-between text-sm">
                <Link href={`/marketplace/${p.id}`} className="text-white hover:text-emerald-400">{p.title}</Link>
                <span className={p.change > 0 ? "text-emerald-400" : "text-red-400"}>
                  {p.change > 0 ? "+" : ""}{(p.change * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </ChaotixCard>
      )}
    </div>
  );
}
