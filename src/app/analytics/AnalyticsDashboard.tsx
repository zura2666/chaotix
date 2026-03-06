"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  LineChart,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Shield,
  Coins,
  Cpu,
} from "lucide-react";
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

type IndexData = {
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

type HistoryPoint = {
  createdAt: string;
  globalIndex: number;
  aiIndex: number;
  cryptoIndex: number;
  geopoliticsIndex: number;
  technologyIndex: number;
};

const CHART_COLORS = {
  global: "#10b981",
  ai: "#8b5cf6",
  crypto: "#f59e0b",
  geopolitics: "#ef4444",
  technology: "#06b6d4",
};

function formatChartDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: d.getHours() ? "2-digit" : undefined });
}

export function AnalyticsDashboard({ initialData }: { initialData: IndexData }) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [historyDays, setHistoryDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/index/narratives/history?days=${historyDays}`)
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled && Array.isArray(body.history)) {
          setHistory(body.history);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [historyDays]);

  const chartData = history.map((h) => ({
    ...h,
    time: formatChartDate(h.createdAt),
    full: new Date(h.createdAt).getTime(),
  }));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-white md:text-3xl">
          Narrative Intelligence Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Global Narrative Index, rising & collapsing narratives, cluster-based indexes. Index = average(narrative strength) per cluster.
        </p>
      </div>

      {/* Global Narrative Index */}
      <ChaotixCard as="div" className="p-6">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-400">
          <BarChart3 className="h-4 w-4" />
          Global Narrative Index
        </h2>
        <p className="text-4xl font-bold text-white tabular-nums">
          {initialData.globalNarrativeIndex.toFixed(2)}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          0–100 scale, volume-weighted narrative strength · Updated {new Date(initialData.updatedAt).toLocaleString()}
        </p>
      </ChaotixCard>

      {/* Cluster-based indexes */}
      <section>
        <h2 className="mb-4 text-sm font-medium text-slate-400">Cluster-based indexes (average narrative strength)</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ChaotixCard as="div" className="p-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-medium">AI Index</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white tabular-nums">
              {initialData.indexes.aiNarrativeIndex.toFixed(2)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">artificial-intelligence</p>
          </ChaotixCard>
          <ChaotixCard as="div" className="p-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Coins className="h-4 w-4" />
              <span className="text-xs font-medium">Crypto Index</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white tabular-nums">
              {initialData.indexes.cryptoNarrativeIndex.toFixed(2)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">crypto</p>
          </ChaotixCard>
          <ChaotixCard as="div" className="p-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Shield className="h-4 w-4" />
              <span className="text-xs font-medium">Geopolitics Index</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white tabular-nums">
              {initialData.indexes.geopoliticsIndex.toFixed(2)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">geopolitics</p>
          </ChaotixCard>
          <ChaotixCard as="div" className="p-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Cpu className="h-4 w-4" />
              <span className="text-xs font-medium">Technology Index</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-white tabular-nums">
              {initialData.indexes.technologyIndex.toFixed(2)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">technology</p>
          </ChaotixCard>
        </div>
      </section>

      {/* Index movement over time */}
      <ChaotixCard as="div" className="p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-400">
          <BarChart3 className="h-4 w-4" />
          Index movement over time
        </h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setHistoryDays(d)}
              className={`rounded px-3 py-1.5 text-sm transition-colors ${
                historyDays === d
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
        {loading ? (
          <div className="h-[280px] flex items-center justify-center text-slate-500 text-sm">Loading chart…</div>
        ) : chartData.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-slate-500 text-sm">
            No history yet. Snapshots are recorded when the API is called (throttled). Try again later or call GET /api/index/narratives to build history.
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "0.75rem",
                  }}
                  labelStyle={{ color: "#94a3b8" }}
                  formatter={(value: number) => [value.toFixed(2), ""]}
                  labelFormatter={(label) => label}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(value) => <span className="text-slate-400">{value}</span>}
                />
                <Line
                  type="monotone"
                  dataKey="globalIndex"
                  name="Global"
                  stroke={CHART_COLORS.global}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="aiIndex"
                  name="AI"
                  stroke={CHART_COLORS.ai}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="cryptoIndex"
                  name="Crypto"
                  stroke={CHART_COLORS.crypto}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="geopoliticsIndex"
                  name="Geopolitics"
                  stroke={CHART_COLORS.geopolitics}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="technologyIndex"
                  name="Technology"
                  stroke={CHART_COLORS.technology}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChaotixCard>

      {/* Top Rising / Top Collapsing */}
      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-emerald-400">
            <TrendingUp className="h-4 w-4" />
            Top Rising Narratives
          </h2>
          {initialData.topRisingNarratives.length === 0 ? (
            <ChaotixCard as="div" className="p-4 text-center text-slate-500 text-sm">
              No rising narratives (positive momentum) yet.
            </ChaotixCard>
          ) : (
            <ul className="space-y-2">
              {initialData.topRisingNarratives.map((r) => (
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
          {initialData.topCollapsingNarratives.length === 0 ? (
            <ChaotixCard as="div" className="p-4 text-center text-slate-500 text-sm">
              No collapsing narratives (negative momentum) yet.
            </ChaotixCard>
          ) : (
            <ul className="space-y-2">
              {initialData.topCollapsingNarratives.map((r) => (
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
        {" · "}
        <code className="rounded bg-white/10 px-1 py-0.5">GET /api/index/narratives/history?days=30</code>
      </p>
    </div>
  );
}
