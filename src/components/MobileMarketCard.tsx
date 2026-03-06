"use client";

import Link from "next/link";

type MobileMarketCardProps = {
  id: string;
  canonical: string;
  displayName: string;
  price: number;
  volume?: number;
  tradeCount: number;
  feedScore?: number;
  sentiment?: string;
  priceChange?: number;
};

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function MobileMarketCard({
  id,
  canonical,
  displayName,
  price,
  volume = 0,
  tradeCount,
  feedScore,
  sentiment,
  priceChange,
}: MobileMarketCardProps) {
  const isUp = priceChange !== undefined && priceChange > 0;
  const isDown = priceChange !== undefined && priceChange < 0;

  return (
    <Link
      href={`/market/${encodeURIComponent(canonical)}`}
      className="block rounded-xl border border-white/5 bg-slate-900/40 p-3 transition active:border-emerald-500/40 sm:p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-white sm:text-base">
          {displayName}
        </h3>
        {priceChange !== undefined && (
          <span
            className={cn(
              "shrink-0 text-xs font-mono sm:text-sm",
              isUp && "text-emerald-400",
              isDown && "text-emerald-400Pink",
              !isUp && !isDown && "text-slate-500"
            )}
          >
            {isUp && "+"}
            {priceChange.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-2 text-xs sm:text-sm">
        <span className="font-mono text-emerald-400">
          ${price.toFixed(4)}
        </span>
        <span className="text-slate-500">{tradeCount} trades</span>
        {volume > 0 && (
          <span className="text-slate-500">vol ${volume.toFixed(0)}</span>
        )}
        {feedScore !== undefined && (
          <span className="text-slate-500">score {feedScore.toFixed(1)}</span>
        )}
        {sentiment && (
          <span className="text-slate-500 truncate">{sentiment}</span>
        )}
      </div>
    </Link>
  );
}
