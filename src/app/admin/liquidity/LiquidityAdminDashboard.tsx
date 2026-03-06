"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type PoolRow = {
  marketId: string;
  canonical: string;
  displayName: string;
  totalLiquidity: number;
  totalLpShares: number;
  volume: number;
  sharePct: number;
};

type SuspiciousRow = {
  id: string;
  type: string;
  userId: string | null;
  marketId: string;
  market: { canonical: string; displayName: string };
  details: string;
  createdAt: string;
};

type Data = {
  biggestPools: PoolRow[];
  totalPools: number;
  totalLiquidity: number;
  suspiciousActivities: SuspiciousRow[];
  manipulationAlerts: Array<{ id: string; type: string; message: string; createdAt: string }>;
};

export function LiquidityAdminDashboard() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch("/api/admin/liquidity")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return <p className="text-slate-500">Loading...</p>;

  return (
    <div className="space-y-8">
      <Link href="/admin" className="text-sm text-slate-500 hover:text-emerald-400">← Admin</Link>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-white">Summary</h2>
        <p className="text-sm text-slate-500">
          Total pools: {data.totalPools} · Total liquidity: {data.totalLiquidity.toFixed(0)}
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-white">Biggest pools</h2>
        <div className="overflow-auto rounded-xl border border-white/10 bg-slate-900/40">
          {data.biggestPools.length === 0 ? (
            <p className="p-4 text-slate-500">No pools</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-chaos-border text-left text-slate-500">
                  <th className="p-2">Market</th>
                  <th className="p-2">Liquidity</th>
                  <th className="p-2">LP shares</th>
                  <th className="p-2">Volume</th>
                  <th className="p-2">Share %</th>
                </tr>
              </thead>
              <tbody>
                {data.biggestPools.map((p) => (
                  <tr key={p.marketId} className="border-b border-chaos-border/50">
                    <td className="p-2">
                      <Link href={`/market/${p.canonical}`} className="text-emerald-400 hover:underline">
                        {p.displayName}
                      </Link>
                    </td>
                    <td className="p-2 font-mono">{p.totalLiquidity.toFixed(0)}</td>
                    <td className="p-2 font-mono">{p.totalLpShares.toFixed(0)}</td>
                    <td className="p-2 font-mono">{p.volume.toFixed(0)}</td>
                    <td className="p-2">{p.sharePct.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-white">Suspicious activities</h2>
        <div className="overflow-auto rounded-xl border border-white/10 bg-slate-900/40 max-h-64">
          {data.suspiciousActivities.length === 0 ? (
            <p className="p-4 text-slate-500">None</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-chaos-border text-left text-slate-500">
                  <th className="p-2">Time</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Market</th>
                  <th className="p-2">User</th>
                  <th className="p-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {data.suspiciousActivities.map((s) => (
                  <tr key={s.id} className="border-b border-chaos-border/50">
                    <td className="p-2 text-slate-500">{new Date(s.createdAt).toLocaleString()}</td>
                    <td className="p-2 text-amber-400">{s.type}</td>
                    <td className="p-2">
                      <Link href={`/market/${s.market.canonical}`} className="text-emerald-400 hover:underline">
                        {s.market.displayName}
                      </Link>
                    </td>
                    <td className="p-2">{s.userId ?? "—"}</td>
                    <td className="p-2 max-w-xs truncate">{s.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-white">Manipulation alerts</h2>
        <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
          {data.manipulationAlerts.length === 0 ? (
            <p className="text-slate-500">No unread alerts</p>
          ) : (
            <ul className="space-y-2">
              {data.manipulationAlerts.map((a) => (
                <li key={a.id} className="flex items-center justify-between text-sm">
                  <span className="text-amber-400">{a.type}</span>
                  <span className="text-slate-500">{a.message}</span>
                  <span className="text-slate-500">{new Date(a.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
