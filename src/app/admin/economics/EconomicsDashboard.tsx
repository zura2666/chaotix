"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { DollarSign, TrendingUp, Users, ShoppingCart } from "lucide-react";

type Economics = {
  platformRevenue: number;
  totalFees: number;
  totalReferralPayouts: number;
  last24h: {
    trades: number;
    volume: number;
    newUsers: number;
    newMarkets: number;
  };
  tradesByDay: { day: string; count: number }[];
};

export function EconomicsDashboard() {
  const [data, setData] = useState<Economics | null>(null);

  useEffect(() => {
    fetch("/api/admin/economics")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return <p className="text-chaos-muted">Loading...</p>;

  return (
    <div className="space-y-8">
      <Link href="/admin" className="text-sm text-chaos-muted hover:text-chaos-neon">
        ← Admin
      </Link>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Revenue & fees</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-chaos-border bg-chaos-card p-4">
            <div className="flex items-center gap-2 text-chaos-muted">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm">Platform revenue</span>
            </div>
            <p className="mt-1 text-2xl font-mono text-chaos-neon">
              {(data.platformRevenue ?? 0).toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-chaos-border bg-chaos-card p-4">
            <span className="text-sm text-chaos-muted">Total fees collected</span>
            <p className="mt-1 text-2xl font-mono text-white">
              {(data.totalFees ?? 0).toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-chaos-border bg-chaos-card p-4">
            <span className="text-sm text-chaos-muted">Referral payouts</span>
            <p className="mt-1 text-2xl font-mono text-chaos-neonPink">
              {(data.totalReferralPayouts ?? 0).toFixed(2)}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Last 24h</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-chaos-border bg-chaos-card p-4">
            <div className="flex items-center gap-2 text-chaos-muted">
              <ShoppingCart className="h-4 w-4" />
              <span className="text-sm">Trades</span>
            </div>
            <p className="mt-1 text-xl font-mono text-white">
              {data.last24h?.trades ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-chaos-border bg-chaos-card p-4">
            <span className="text-sm text-chaos-muted">Volume</span>
            <p className="mt-1 text-xl font-mono text-chaos-neon">
              ${(data.last24h?.volume ?? 0).toFixed(0)}
            </p>
          </div>
          <div className="rounded-xl border border-chaos-border bg-chaos-card p-4">
            <div className="flex items-center gap-2 text-chaos-muted">
              <Users className="h-4 w-4" />
              <span className="text-sm">New users</span>
            </div>
            <p className="mt-1 text-xl font-mono text-white">
              {data.last24h?.newUsers ?? 0}
            </p>
          </div>
          <div className="rounded-xl border border-chaos-border bg-chaos-card p-4">
            <div className="flex items-center gap-2 text-chaos-muted">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">New markets</span>
            </div>
            <p className="mt-1 text-xl font-mono text-white">
              {data.last24h?.newMarkets ?? 0}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Trades by day (last 7)</h2>
        <div className="rounded-xl border border-chaos-border bg-chaos-card overflow-hidden">
          {data.tradesByDay?.length === 0 ? (
            <p className="p-4 text-chaos-muted">No data</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-chaos-border text-left text-chaos-muted">
                  <th className="p-3">Day</th>
                  <th className="p-3 text-right">Trades</th>
                </tr>
              </thead>
              <tbody>
                {data.tradesByDay?.map((r) => (
                  <tr key={r.day} className="border-b border-chaos-border/50">
                    <td className="p-3">{r.day}</td>
                    <td className="p-3 text-right font-mono">{r.count}</td>
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
