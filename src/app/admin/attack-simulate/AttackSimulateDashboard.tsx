"use client";

import { useState } from "react";
import Link from "next/link";

type RiskAnalysis = {
  overall: { score: number; risk: string };
  washTrading: { score: number; risk: string; suspiciousUsers?: number; totalTraders?: number };
  liquidityDraining: { score: number; risk: string; thinMarkets?: number };
  botSwarm: { score: number; risk: string; suspectedBots?: number };
  manipulationClusters: { score: number; risk: string };
};

export function AttackSimulateDashboard() {
  const [result, setResult] = useState<{ riskAnalysis: RiskAnalysis; summary: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const run = () => {
    setLoading(true);
    setResult(null);
    fetch("/api/admin/attack-simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenario: "full" }),
    })
      .then((r) => r.json())
      .then((d) => setResult({ riskAnalysis: d.riskAnalysis, summary: d.summary ?? "" }))
      .catch(() => setResult(null))
      .finally(() => setLoading(false));
  };

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm text-slate-500 hover:text-emerald-400">← Admin</Link>
      <p className="text-sm text-slate-500">
        Simulate fraud and economic attack vectors: wash trading, liquidity draining, bot swarm, manipulation clusters.
      </p>
      <button
        onClick={run}
        disabled={loading}
        className="rounded-lg border border-chaos-neon bg-chaos-neon/10 px-4 py-2 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
      >
        {loading ? "Running…" : "Run simulation"}
      </button>
      {result && (
        <div className="space-y-4 rounded-xl border border-white/10 bg-slate-900/40 p-4">
          <p className="text-white">{result.summary}</p>
          <div className="grid gap-2 text-sm">
            <div>
              <span className="text-slate-500">Overall: </span>
              <span className={result.riskAnalysis.overall.risk === "elevated" ? "text-amber-400" : "text-emerald-400"}>
                {result.riskAnalysis.overall.risk}
              </span>
              {" "}(score: {result.riskAnalysis.overall.score.toFixed(2)})
            </div>
            <div>
              <span className="text-slate-500">Wash trading: </span>
              {result.riskAnalysis.washTrading.risk} (suspicious: {result.riskAnalysis.washTrading.suspiciousUsers ?? "—"})
            </div>
            <div>
              <span className="text-slate-500">Liquidity draining: </span>
              {result.riskAnalysis.liquidityDraining.risk} (thin: {result.riskAnalysis.liquidityDraining.thinMarkets ?? "—"})
            </div>
            <div>
              <span className="text-slate-500">Bot swarm: </span>
              {result.riskAnalysis.botSwarm.risk} (suspected: {result.riskAnalysis.botSwarm.suspectedBots ?? "—"})
            </div>
            <div>
              <span className="text-slate-500">Manipulation clusters: </span>
              {result.riskAnalysis.manipulationClusters.risk}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
