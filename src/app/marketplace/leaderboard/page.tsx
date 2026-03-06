"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { Trophy, PlusCircle } from "lucide-react";

type LeaderboardData = {
  topTraders: { user?: { id: string; name: string | null; username: string | null }; volume: number; tradeCount: number }[];
  topCreators: { user?: { id: string; name: string | null; username: string | null }; assetCount: number; volume24h: number }[];
};

export default function MarketplaceLeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/marketplace/leaderboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/marketplace" className="mb-6 inline-block text-sm text-slate-500 hover:text-emerald-400">
        ← Marketplace
      </Link>
      <h1 className="text-2xl font-bold text-white">Marketplace leaderboard</h1>
      <p className="mt-1 text-sm text-slate-400">Top traders and creators by volume.</p>

      {loading ? (
        <ChaotixCard as="div" className="mt-8 p-8 text-center text-slate-500">Loading…</ChaotixCard>
      ) : data ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <ChaotixCard as="div" className="p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-400">
              <Trophy className="h-4 w-4" /> Top traders
            </h2>
            <div className="space-y-2">
              {data.topTraders.map((t, i) => (
                <div key={t.user?.id ?? i} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm">
                  <Link
                    href={t.user?.username ? `/u/${t.user.username}` : "#"}
                    className="font-medium text-white hover:text-emerald-400"
                  >
                    #{i + 1} {t.user?.name || t.user?.username || "Anonymous"}
                  </Link>
                  <span className="text-slate-400">
                    Vol {t.volume.toFixed(0)} · {t.tradeCount} trades
                  </span>
                </div>
              ))}
            </div>
          </ChaotixCard>
          <ChaotixCard as="div" className="p-4">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-400">
              <PlusCircle className="h-4 w-4" /> Top creators
            </h2>
            <div className="space-y-2">
              {data.topCreators.map((c, i) => (
                <div key={c.user?.id ?? i} className="flex items-center justify-between rounded-lg px-3 py-2 text-sm">
                  <Link
                    href={c.user?.username ? `/u/${c.user.username}` : "#"}
                    className="font-medium text-white hover:text-emerald-400"
                  >
                    #{i + 1} {c.user?.name || c.user?.username || "Anonymous"}
                  </Link>
                  <span className="text-slate-400">
                    {c.assetCount} assets · Vol 24h {c.volume24h.toFixed(0)}
                  </span>
                </div>
              ))}
            </div>
          </ChaotixCard>
        </div>
      ) : null}
    </div>
  );
}
