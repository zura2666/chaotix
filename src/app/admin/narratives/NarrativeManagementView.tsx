"use client";

import { useState } from "react";
import Link from "next/link";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { ChaotixButton } from "@/components/ui/ChaotixButton";
import { PlusCircle, Archive, ExternalLink } from "lucide-react";

type CoreMarket = {
  id: string;
  canonical: string;
  displayName: string;
  status: string;
  volume: number;
  tradeCount: number;
  createdAt: string;
};

type MarketRow = {
  id: string;
  canonical: string;
  displayName: string;
  isCoreMarket: boolean;
};

type Props = {
  coreMarkets: CoreMarket[];
  allMarkets: MarketRow[];
};

export function NarrativeManagementView({ coreMarkets, allMarkets }: Props) {
  const [canonical, setCanonical] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [retiringId, setRetiringId] = useState<string | null>(null);
  const [list, setList] = useState(coreMarkets);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const raw = canonical.trim();
    if (!raw || raw.length < 2) {
      setError("Enter a canonical identifier (e.g. ai, bitcoin).");
      return;
    }
    setSubmitting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const csrfMatch = typeof document !== "undefined" ? document.cookie.match(/csrf_token=([^;]+)/) : null;
      if (csrfMatch?.[1]) headers["x-csrf-token"] = decodeURIComponent(csrfMatch[1]);
      const res = await fetch("/api/markets", {
        method: "POST",
        headers,
        body: JSON.stringify({ canonical: raw }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to create market.");
        return;
      }
      setSuccess(`Created: ${data.market?.canonical ?? raw}`);
      setCanonical("");
      if (data.market) {
        setList((prev) => [
          ...prev,
          {
            id: data.market.id,
            canonical: data.market.canonical,
            displayName: data.market.displayName ?? data.market.canonical,
            status: "active",
            volume: 0,
            tradeCount: 0,
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetire = async (marketId: string) => {
    setRetiringId(marketId);
    setError("");
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const csrfMatch = typeof document !== "undefined" ? document.cookie.match(/csrf_token=([^;]+)/) : null;
      if (csrfMatch?.[1]) headers["x-csrf-token"] = decodeURIComponent(csrfMatch[1]);
      const res = await fetch(`/api/admin/markets/${marketId}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ retire: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to retire.");
        return;
      }
      setList((prev) => prev.filter((m) => m.id !== marketId));
      setSuccess(`Retired: ${data.retired ?? marketId}`);
    } finally {
      setRetiringId(null);
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <PlusCircle className="h-5 w-5 text-emerald-400" />
          Create new narrative
        </h2>
        <ChaotixCard as="div" className="p-4">
          <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px]">
              <label className="mb-1 block text-xs text-slate-500">Canonical</label>
              <input
                type="text"
                value={canonical}
                onChange={(e) => setCanonical(e.target.value)}
                placeholder="e.g. new-narrative"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-chaos-primary focus:outline-none"
              />
            </div>
            <ChaotixButton type="submit" disabled={submitting} size="sm">
              {submitting ? "Creating…" : "Create"}
            </ChaotixButton>
          </form>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          {success && <p className="mt-2 text-sm text-emerald-400">{success}</p>}
        </ChaotixCard>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Core narrative markets ({list.length})</h2>
        <ChaotixCard as="div" className="overflow-hidden p-0">
          <div className="max-h-[400px] overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs text-slate-500">
                  <th className="p-3">Canonical</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Volume</th>
                  <th className="p-3 text-right">Trades</th>
                  <th className="p-3 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="p-3">
                      <Link
                        href={`/market/${encodeURIComponent(m.canonical)}`}
                        className="font-medium text-slate-200 hover:text-emerald-400 inline-flex items-center gap-1"
                      >
                        {m.displayName}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                      <span className="ml-1 font-mono text-xs text-slate-500">{m.canonical}</span>
                    </td>
                    <td className="p-3 text-slate-400">{m.status}</td>
                    <td className="p-3 text-right font-mono text-slate-300">${m.volume.toFixed(0)}</td>
                    <td className="p-3 text-right font-mono text-slate-300">{m.tradeCount}</td>
                    <td className="p-3">
                      {m.status === "active" && (
                        <button
                          type="button"
                          onClick={() => handleRetire(m.id)}
                          disabled={retiringId === m.id}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                          title="Retire (archive) market"
                        >
                          <Archive className="h-3 w-3" />
                          {retiringId === m.id ? "…" : "Retire"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChaotixCard>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Merge duplicates</h2>
        <p className="mb-2 text-sm text-slate-500">
          Find similar markets and merge them. Pairs are suggested by concept similarity.
        </p>
        <ChaotixButton href="/admin/market-merge" variant="secondary" size="sm">
          Open Market merge
        </ChaotixButton>
      </section>
    </div>
  );
}
