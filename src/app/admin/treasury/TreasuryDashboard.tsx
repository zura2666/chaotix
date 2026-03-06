"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type TreasuryStats = {
  dailyFees: number;
  dailyLpRewards: number;
  dailyReferralPayouts: number;
  dailyPlatformProfit: number;
  totalFees: number;
  totalLpRewards: number;
  totalReferralPayouts: number;
  totalTreasury: number;
};

export function TreasuryDashboard() {
  const [data, setData] = useState<TreasuryStats | null>(null);
  useEffect(() => {
    fetch("/api/admin/treasury").then((r) => r.json()).then(setData).catch(() => {});
  }, []);
  if (!data) return <p className="text-chaos-muted">Loading...</p>;
  return (
    <div className="space-y-8">
      <Link href="/admin" className="text-sm text-chaos-muted hover:text-chaos-neon">← Admin</Link>
      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Today</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-chaos-border bg-chaos-card p-4">
            <span className="text-sm text-chaos-muted">Daily fees</span>
            <p className="mt-1 text-2xl font-mono text-chaos-neon">{data.dailyFees.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-chaos-border bg-chaos-card p-4">
            <span className="text-sm text-chaos-muted">LP rewards</span>
            <p className="mt-1 text-2xl font-mono text-white">{data.dailyLpRewards.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-chaos-border bg-chaos-card p-4">
            <span className="text-sm text-chaos-muted">Referral payouts</span>
            <p className="mt-1 text-2xl font-mono text-chaos-neonPink">{data.dailyReferralPayouts.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-chaos-border bg-chaos-card p-4">
            <span className="text-sm text-chaos-muted">Platform profit (today)</span>
            <p className="mt-1 text-2xl font-mono text-green-400">{data.dailyPlatformProfit.toFixed(2)}</p>
          </div>
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">All time</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-chaos-border bg-chaos-card p-4">
            <span className="text-sm text-chaos-muted">Total fees</span>
            <p className="mt-1 text-xl font-mono text-white">{data.totalFees.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-chaos-border bg-chaos-card p-4">
            <span className="text-sm text-chaos-muted">Total LP rewards</span>
            <p className="mt-1 text-xl font-mono text-white">{data.totalLpRewards.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-chaos-border bg-chaos-card p-4">
            <span className="text-sm text-chaos-muted">Total referral payouts</span>
            <p className="mt-1 text-xl font-mono text-chaos-neonPink">{data.totalReferralPayouts.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-chaos-border bg-chaos-card p-4">
            <span className="text-sm text-chaos-muted">Platform treasury</span>
            <p className="mt-1 text-xl font-mono text-chaos-neon">{data.totalTreasury.toFixed(2)}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
