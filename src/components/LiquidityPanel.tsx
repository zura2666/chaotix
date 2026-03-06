"use client";

import { useState, useEffect } from "react";
import { Droplets, Users, Award, Wallet } from "lucide-react";

type LpSummary = {
  totalTokens?: number;
  totalLpTokens?: number;
  totalLpFeesAccrued?: number;
  aprEstimate?: number;
  topLps?: Array<{
    user?: { name?: string | null; email?: string | null };
    lpTokens?: number;
    sharePct?: number;
    feesEarned?: number;
  }>;
};

type Reputation = {
  reputationScore?: number;
  traderCount?: number;
  tradeCount?: number;
  volumeScore?: number;
  ageScore?: number;
};

type PoolData = {
  totalLiquidity?: number;
  totalLpShares?: number;
};

type MyPosition = {
  lpShares: number;
  liquidity: number;
  feesEarned: number;
};

export function LiquidityPanel({
  canonical,
  marketId,
  onRefresh,
}: {
  canonical: string;
  marketId: string;
  onRefresh?: () => void;
}) {
  const [summary, setSummary] = useState<LpSummary | null>(null);
  const [reputation, setReputation] = useState<Reputation | null>(null);
  const [pool, setPool] = useState<PoolData | null>(null);
  const [myPosition, setMyPosition] = useState<MyPosition | null>(null);
  const [addAmount, setAddAmount] = useState("");
  const [removeAmount, setRemoveAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    fetch(`/api/liquidity/${encodeURIComponent(marketId)}`)
      .then((r) => r.json())
      .then((d) => {
        setPool(d.pool ?? null);
        setSummary(d.summary ?? null);
        setMyPosition(d.myPosition ?? null);
      })
      .catch(() => {});
    fetch(`/api/markets/${encodeURIComponent(canonical)}/reputation`)
      .then((r) => r.json())
      .then(setReputation)
      .catch(() => {});
  };

  useEffect(() => {
    load();
  }, [marketId, canonical]);

  const handleAdd = async () => {
    const amt = Number(addAmount);
    if (!Number.isFinite(amt) || amt < 1) return;
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/liquidity/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketId, amount: amt }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error ?? "Failed");
        return;
      }
      setAddAmount("");
      if (d.summary) setSummary(d.summary);
      load();
      onRefresh?.();
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    const amt = Number(removeAmount);
    if (!Number.isFinite(amt) || amt <= 0 || (myPosition?.lpShares ?? 0) < amt) return;
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/liquidity/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketId, lpTokensToBurn: amt }),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error ?? "Failed");
        return;
      }
      setRemoveAmount("");
      if (d.summary) setSummary(d.summary);
      load();
      onRefresh?.();
    } finally {
      setLoading(false);
    }
  };

  const totalLiquidity = pool?.totalLiquidity ?? summary?.totalTokens ?? 0;
  const totalLpShares = pool?.totalLpShares ?? summary?.totalLpTokens ?? 0;

  return (
    <div className="rounded-xl border border-chaos-border bg-chaos-card p-4 space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-medium text-chaos-muted">
        <Droplets className="h-4 w-4" /> Liquidity pool
      </h3>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-chaos-muted">Pool size</p>
          <p className="font-mono text-chaos-neon">{totalLiquidity.toFixed(0)}</p>
        </div>
        <div>
          <p className="text-chaos-muted">LP shares</p>
          <p className="font-mono text-white">{totalLpShares.toFixed(0)}</p>
        </div>
      </div>

      {reputation != null && (reputation.reputationScore ?? 0) > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Award className="h-4 w-4 text-chaos-neon" />
          <span className="text-chaos-muted">Reputation:</span>
          <span className="font-mono text-chaos-neon">
            {(reputation.reputationScore ?? 0).toFixed(2)}
          </span>
          <span className="text-chaos-muted text-xs">
            ({reputation.traderCount ?? 0} traders, {reputation.tradeCount ?? 0} trades)
          </span>
        </div>
      )}

      {summary?.topLps && summary.topLps.length > 0 && (
        <div>
          <p className="mb-1 text-xs text-chaos-muted">Top LP providers</p>
          <ul className="space-y-1 max-h-24 overflow-auto text-xs">
            {summary.topLps.slice(0, 5).map((lp, i) => (
              <li key={i} className="flex justify-between">
                <span className="text-white truncate">
                  {lp.user?.name || lp.user?.email || "—"}
                </span>
                <span className="font-mono text-chaos-neon ml-2">
                  {(lp.sharePct ?? 0).toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {myPosition && (myPosition.lpShares > 0 || myPosition.feesEarned > 0) && (
        <div className="rounded border border-chaos-border/50 p-2">
          <p className="flex items-center gap-1 text-xs text-chaos-muted">
            <Wallet className="h-3 w-3" /> Your position
          </p>
          <p className="text-sm text-white">
            LP shares: <span className="font-mono">{myPosition.lpShares.toFixed(2)}</span>
            {" · "}
            Fees earned: <span className="font-mono text-chaos-neon">{myPosition.feesEarned.toFixed(2)}</span>
          </p>
        </div>
      )}

      <div className="space-y-2">
        <input
          type="number"
          value={addAmount}
          onChange={(e) => setAddAmount(e.target.value)}
          placeholder="Amount to add"
          min="1"
          className="w-full rounded-lg border border-chaos-border bg-chaos-bg px-3 py-2 text-sm outline-none focus:border-chaos-neon"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={loading || !addAmount || Number(addAmount) < 1}
          className="w-full rounded-lg bg-chaos-neon/20 py-2 text-sm font-medium text-chaos-neon hover:bg-chaos-neon/30 disabled:opacity-50"
        >
          Add liquidity
        </button>
      </div>

      {myPosition && myPosition.lpShares > 0 && (
        <div className="space-y-2">
          <input
            type="number"
            value={removeAmount}
            onChange={(e) => setRemoveAmount(e.target.value)}
            placeholder="LP shares to remove"
            min="0"
            max={myPosition.lpShares}
            className="w-full rounded-lg border border-chaos-border bg-chaos-bg px-3 py-2 text-sm outline-none focus:border-chaos-neon"
          />
          <button
            type="button"
            onClick={handleRemove}
            disabled={loading || !removeAmount || Number(removeAmount) <= 0 || Number(removeAmount) > myPosition.lpShares}
            className="w-full rounded-lg border border-chaos-neonPink/50 py-2 text-sm text-chaos-neonPink hover:bg-chaos-neonPink/10 disabled:opacity-50"
          >
            Remove liquidity
          </button>
        </div>
      )}

      {summary?.aprEstimate != null && summary.aprEstimate > 0 && (
        <p className="text-xs text-chaos-muted">
          Estimated APR: <span className="font-mono text-chaos-neon">{summary.aprEstimate}%</span>
        </p>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
