"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart3, Users, ShoppingCart, AlertCircle } from "lucide-react";

type Metrics = {
  userCount: number;
  marketCount: number;
  tradeCount: number;
  totalVolume: number;
};

export function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentTrades, setRecentTrades] = useState<unknown[]>([]);
  const [failedAttempts, setFailedAttempts] = useState<unknown[]>([]);
  const [banUserId, setBanUserId] = useState("");
  const [deleteMarketId, setDeleteMarketId] = useState("");
  const [loading, setLoading] = useState(false);

  const load = () => {
    fetch("/api/admin")
      .then((r) => r.json())
      .then((d) => {
        setMetrics(d.metrics);
        setRecentTrades(d.recentTrades ?? []);
        setFailedAttempts(d.failedAttempts ?? []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  const handleBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banUserId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${banUserId.trim()}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBanned: true }),
      });
      if (res.ok) setBanUserId("");
      load();
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMarket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteMarketId.trim()) return;
    setLoading(true);
    try {
      await fetch(`/api/admin/markets/${deleteMarketId.trim()}`, {
        method: "DELETE",
      });
      setDeleteMarketId("");
      load();
    } finally {
      setLoading(false);
    }
  };

  if (!metrics) {
    return <p className="text-slate-500">Loading...</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex gap-4">
        <Link href="/" className="text-sm text-slate-500 hover:text-emerald-400">
          ← Home
        </Link>
        <Link href="/admin/economics" className="text-sm text-emerald-400 hover:underline">
          Economics
        </Link>
        <Link href="/admin/treasury" className="text-sm text-emerald-400 hover:underline">
          Treasury
        </Link>
        <Link href="/admin/liquidity" className="text-sm text-emerald-400 hover:underline">
          Liquidity
        </Link>
        <Link href="/admin/market-intelligence" className="text-sm text-emerald-400 hover:underline">
          Market intelligence
        </Link>
        <Link href="/admin/narratives" className="text-sm text-emerald-400 hover:underline">
          Narrative Management
        </Link>
        <Link href="/admin/market-merge" className="text-sm text-emerald-400 hover:underline">
          Market merge
        </Link>
        <Link href="/admin/manipulation" className="text-sm text-emerald-400 hover:underline">
          Manipulation
        </Link>
        <Link href="/admin/moderation" className="text-sm text-emerald-400 hover:underline">
          Moderation
        </Link>
        <Link href="/admin/attack-simulate" className="text-sm text-emerald-400 hover:underline">
          Attack simulate
        </Link>
        <Link href="/admin/referrals" className="text-sm text-emerald-400 hover:underline">
          Partner referrals
        </Link>
      </div>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <BarChart3 className="h-5 w-5" /> Metrics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <Users className="h-4 w-4" />
              <span className="text-sm">Users</span>
            </div>
            <p className="mt-1 text-2xl font-mono text-white">
              {metrics.userCount}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <span className="text-sm">Markets</span>
            </div>
            <p className="mt-1 text-2xl font-mono text-white">
              {metrics.marketCount}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <ShoppingCart className="h-4 w-4" />
              <span className="text-sm">Trades</span>
            </div>
            <p className="mt-1 text-2xl font-mono text-white">
              {metrics.tradeCount}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
            <div className="flex items-center gap-2 text-slate-500">
              <span className="text-sm">Total volume</span>
            </div>
            <p className="mt-1 text-2xl font-mono text-emerald-400">
              ${metrics.totalVolume.toFixed(0)}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Ban user</h2>
        <form onSubmit={handleBan} className="flex gap-2">
          <input
            type="text"
            value={banUserId}
            onChange={(e) => setBanUserId(e.target.value)}
            placeholder="User ID"
            className="rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-sm outline-none focus:border-emerald-500/50"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-400 hover:bg-red-500/30"
          >
            Ban
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">
          Remove market (spam)
        </h2>
        <form onSubmit={handleDeleteMarket} className="flex gap-2">
          <input
            type="text"
            value={deleteMarketId}
            onChange={(e) => setDeleteMarketId(e.target.value)}
            placeholder="Market ID"
            className="rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2 text-sm outline-none focus:border-emerald-500/50"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20"
          >
            Delete market
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <AlertCircle className="h-5 w-5" /> Failed trade attempts
        </h2>
        <div className="max-h-64 overflow-auto rounded-xl border border-white/10 bg-slate-900/40">
          {failedAttempts.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">None</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-500">
                  <th className="p-2">Time</th>
                  <th className="p-2">User</th>
                  <th className="p-2">Action</th>
                  <th className="p-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {(failedAttempts as { id: string; userId?: string; action: string; error?: string; createdAt: string }[]).map((a) => (
                  <tr key={a.id} className="border-b border-white/10/50">
                    <td className="p-2 text-slate-500">
                      {new Date(a.createdAt).toLocaleString()}
                    </td>
                    <td className="p-2">{a.userId ?? "—"}</td>
                    <td className="p-2">{a.action}</td>
                    <td className="p-2 text-red-400">{a.error ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Recent trades</h2>
        <div className="max-h-64 overflow-auto rounded-xl border border-white/10 bg-slate-900/40">
          {recentTrades.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">None</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-slate-500">
                  <th className="p-2">Time</th>
                  <th className="p-2">Market</th>
                  <th className="p-2">Side</th>
                  <th className="p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {(recentTrades as { id: string; side: string; total: number; createdAt: string; market?: { displayName: string }; user?: { email: string | null } }[]).map((t) => (
                  <tr key={t.id} className="border-b border-white/10/50">
                    <td className="p-2 text-slate-500">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td className="p-2">{t.market?.displayName ?? "—"}</td>
                    <td className="p-2">{t.side}</td>
                    <td className="p-2 font-mono">{t.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
