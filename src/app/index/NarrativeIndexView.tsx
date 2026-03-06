"use client";

import Link from "next/link";
import { TrendingUp, TrendingDown, BarChart3, Activity, Shield, Coins } from "lucide-react";
import { ChaotixCard } from "@/components/ui/ChaotixCard";

type NarrativeIndexRow = {
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  index: number;
  momentum: number;
  marketCount: number;
  totalVolume24h: number;
  clusterStrengthIndex: number;
};

type Data = {
  globalNarrativeIndex: number;
  topRisingNarratives: NarrativeIndexRow[];
  topCollapsingNarratives: NarrativeIndexRow[];
  indexes: {
    aiNarrativeIndex: number;
    cryptoNarrativeIndex: number;
    geopoliticsIndex: number;
    technologyIndex: number;
  };
  updatedAt: string;
};

export function NarrativeIndexView({ data }: { data: Data }) {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-400"
      >
        ← Home
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-white md:text-3xl">
          Narrative Intelligence
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Global and cluster-derived narrative indexes. Updated {new Date(data.updatedAt).toLocaleString()}.
        </p>
      </div>

      {/* Global Narrative Index */}
      <ChaotixCard as="div" className="p-6">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-400">
          <BarChart3 className="h-4 w-4" />
          Global Narrative Index
        </h2>
        <p className="text-4xl font-bold text-white tabular-nums">
          {data.globalNarrativeIndex.toFixed(2)}
        </p>
        <p className="mt-1 text-xs text-slate-500">0–100 scale, volume-weighted narrative strength across active markets</p>
      </ChaotixCard>

      {/* Derived indexes */}
      <section>
        <h2 className="mb-4 text-sm font-medium text-slate-400">Cluster-based indexes (average narrative strength)</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ChaotixCard as="div" className="p-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-medium">AI Narrative Index</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white tabular-nums">
              {data.indexes.aiNarrativeIndex.toFixed(2)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">artificial-intelligence cluster</p>
          </ChaotixCard>
          <ChaotixCard as="div" className="p-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Shield className="h-4 w-4" />
              <span className="text-xs font-medium">Geopolitics Index</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white tabular-nums">
              {data.indexes.geopoliticsIndex.toFixed(2)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">geopolitics cluster</p>
          </ChaotixCard>
          <ChaotixCard as="div" className="p-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Coins className="h-4 w-4" />
              <span className="text-xs font-medium">Crypto Index</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white tabular-nums">
              {data.indexes.cryptoNarrativeIndex.toFixed(2)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">crypto cluster</p>
          </ChaotixCard>
          <ChaotixCard as="div" className="p-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-medium">Technology Index</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white tabular-nums">
              {data.indexes.technologyIndex.toFixed(2)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">technology cluster</p>
          </ChaotixCard>
        </div>
      </section>

      {/* Top Rising / Top Collapsing */}
      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-emerald-400">
            <TrendingUp className="h-4 w-4" />
            Top Rising Narratives
          </h2>
          {data.topRisingNarratives.length === 0 ? (
            <ChaotixCard as="div" className="p-4 text-center text-slate-500 text-sm">
              No rising narratives (positive momentum) yet.
            </ChaotixCard>
          ) : (
            <ul className="space-y-2">
              {data.topRisingNarratives.map((r) => (
                <li key={r.slug}>
                  <ChaotixCard as="div" className="p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {r.icon && <span className="text-lg">{r.icon}</span>}
                        <Link
                          href={`/cluster/${r.slug}`}
                          className="font-medium text-slate-200 hover:text-emerald-400"
                        >
                          {r.name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-slate-400">Index {r.index.toFixed(1)}</span>
                        <span className="text-emerald-400">+{(r.momentum * 100).toFixed(2)}% 24h</span>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {r.marketCount} markets · Vol 24h ${r.totalVolume24h.toFixed(0)}
                    </p>
                  </ChaotixCard>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-red-400">
            <TrendingDown className="h-4 w-4" />
            Top Collapsing Narratives
          </h2>
          {data.topCollapsingNarratives.length === 0 ? (
            <ChaotixCard as="div" className="p-4 text-center text-slate-500 text-sm">
              No collapsing narratives (negative momentum) yet.
            </ChaotixCard>
          ) : (
            <ul className="space-y-2">
              {data.topCollapsingNarratives.map((r) => (
                <li key={r.slug}>
                  <ChaotixCard as="div" className="p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {r.icon && <span className="text-lg">{r.icon}</span>}
                        <Link
                          href={`/cluster/${r.slug}`}
                          className="font-medium text-slate-200 hover:text-red-400"
                        >
                          {r.name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-slate-400">Index {r.index.toFixed(1)}</span>
                        <span className="text-red-400">{(r.momentum * 100).toFixed(2)}% 24h</span>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {r.marketCount} markets · Vol 24h ${r.totalVolume24h.toFixed(0)}
                    </p>
                  </ChaotixCard>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="text-center text-xs text-slate-500">
        Public API: <code className="rounded bg-white/10 px-1 py-0.5">GET /api/index/narratives</code>
      </p>
    </div>
  );
}
