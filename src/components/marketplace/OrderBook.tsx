"use client";

import { useMemo } from "react";

type Level = { price: number; quantity: number; cumulative?: number };

export function OrderBook({
  bids,
  asks,
  highestBid,
  lowestAsk,
  spread,
  maxLevels = 12,
}: {
  bids: Level[];
  asks: Level[];
  highestBid: number | null;
  lowestAsk: number | null;
  spread: number | null;
  maxLevels?: number;
}) {
  const topBids = bids.slice(0, maxLevels);
  const topAsks = asks.slice(0, maxLevels);

  const maxDepth = useMemo(() => {
    const b = topBids.reduce((m, l) => Math.max(m, l.cumulative ?? l.quantity), 0);
    const a = topAsks.reduce((m, l) => Math.max(m, l.cumulative ?? l.quantity), 0);
    return Math.max(b, a, 1);
  }, [topBids, topAsks]);

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Order book</span>
        <span>
          Spread{" "}
          <span className="font-mono text-slate-300">
            {spread != null ? spread.toFixed(2) : "—"}
          </span>
          {" · "}
          Bid{" "}
          <span className="font-mono text-slate-300">
            {highestBid != null ? highestBid.toFixed(2) : "—"}
          </span>
          {" · "}
          Ask{" "}
          <span className="font-mono text-slate-300">
            {lowestAsk != null ? lowestAsk.toFixed(2) : "—"}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Bids */}
        <div>
          <div className="mb-2 text-xs font-medium text-amber-400">Bids (buy wall)</div>
          <div className="space-y-1">
            {topBids.length === 0 ? (
              <div className="text-sm text-slate-500">No bids</div>
            ) : (
              topBids.map((l, i) => {
                const depth = l.cumulative ?? l.quantity;
                const w = Math.min(100, Math.round((depth / maxDepth) * 100));
                return (
                  <div key={i} className="relative overflow-hidden rounded bg-white/5 px-2 py-1 text-sm">
                    <div
                      className="absolute inset-y-0 left-0 bg-amber-500/15"
                      style={{ width: `${w}%` }}
                    />
                    <div className="relative flex justify-between gap-2">
                      <span className="font-mono text-amber-400">{l.price.toFixed(2)}</span>
                      <span className="font-mono text-slate-200">{l.quantity.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Asks */}
        <div>
          <div className="mb-2 text-xs font-medium text-emerald-400">Asks (sell wall)</div>
          <div className="space-y-1">
            {topAsks.length === 0 ? (
              <div className="text-sm text-slate-500">No asks</div>
            ) : (
              topAsks.map((l, i) => {
                const depth = l.cumulative ?? l.quantity;
                const w = Math.min(100, Math.round((depth / maxDepth) * 100));
                return (
                  <div key={i} className="relative overflow-hidden rounded bg-white/5 px-2 py-1 text-sm">
                    <div
                      className="absolute inset-y-0 left-0 bg-emerald-500/15"
                      style={{ width: `${w}%` }}
                    />
                    <div className="relative flex justify-between gap-2">
                      <span className="font-mono text-emerald-400">{l.price.toFixed(2)}</span>
                      <span className="font-mono text-slate-200">{l.quantity.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

