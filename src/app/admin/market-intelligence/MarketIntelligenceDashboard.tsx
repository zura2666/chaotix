"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type MarketRow = {
  id: string;
  canonical: string;
  displayName: string;
  price: number;
  volume: number;
  tradeCount: number;
  resilienceScore?: number;
  growthRate7d?: number;
  retentionScore?: number;
  priceVolatility?: number;
};

type Data = {
  mostResilient: MarketRow[];
  fastestGrowing: MarketRow[];
  abnormalPatterns: MarketRow[];
  highestRetention: MarketRow[];
};

function Table({
  title,
  rows,
  cols,
}: {
  title: string;
  rows: MarketRow[];
  cols: { key: keyof MarketRow; label: string }[];
}) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-white">{title}</h2>
      <div className="overflow-auto rounded-xl border border-chaos-border bg-chaos-card">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-chaos-muted">None</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-chaos-border text-left text-chaos-muted">
                <th className="p-2">Market</th>
                {cols.map((c) => (
                  <th key={c.key} className="p-2">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.id} className="border-b border-chaos-border/50">
                  <td className="p-2">
                    <Link href={`/market/${m.canonical}`} className="text-chaos-neon hover:underline">
                      {m.displayName}
                    </Link>
                  </td>
                  {cols.map((c) => (
                    <td key={c.key} className="p-2 font-mono">
                      {typeof m[c.key] === "number" ? (m[c.key] as number).toFixed(2) : String(m[c.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export function MarketIntelligenceDashboard() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    fetch("/api/admin/market-intelligence")
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

      <Table
        title="Most resilient markets"
        rows={data.mostResilient}
        cols={[
          { key: "price", label: "Price" },
          { key: "volume", label: "Volume" },
          { key: "resilienceScore", label: "Resilience" },
        ]}
      />
      <Table
        title="Fastest growing (7d)"
        rows={data.fastestGrowing}
        cols={[
          { key: "price", label: "Price" },
          { key: "volume", label: "Volume" },
          { key: "growthRate7d", label: "Growth rate" },
        ]}
      />
      <Table
        title="Abnormal patterns"
        rows={data.abnormalPatterns}
        cols={[
          { key: "price", label: "Price" },
          { key: "priceVolatility", label: "Volatility" },
          { key: "growthRate7d", label: "Growth" },
        ]}
      />
      <Table
        title="Highest retention"
        rows={data.highestRetention}
        cols={[
          { key: "tradeCount", label: "Trades" },
          { key: "retentionScore", label: "Retention" },
        ]}
      />
    </div>
  );
}
