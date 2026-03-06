import Link from "next/link";
import { clsx } from "clsx";
import { NSI_TOOLTIP } from "@/lib/narrative-strength";

type Market = {
  id: string;
  canonical: string;
  displayName: string;
  price: number;
  volume: number;
  tradeCount: number;
  priceChange?: number;
  recentVolume?: number;
  uniqueTraders24h?: number;
  category?: { slug: string; name: string } | null;
  tags?: string[] | string;
};

/** Narrative Strength tooltip + interpretation. */
const NSI_TITLE = `${NSI_TOOLTIP} Scale: 0.00 = irrelevant, 0.25 = niche, 0.50 = moderate, 0.75 = dominant, 1.00 = max.`;

/** Normalize tags to string[] (API/DB may return JSON string). */
function marketTags(tags: Market["tags"]): string[] {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === "string") {
    try {
      const parsed = JSON.parse(tags);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Stable emoji from market string for avatar */
function marketEmoji(canonical: string) {
  const emojis = ["📈", "🎯", "⚡", "🔥", "💹", "🌟", "🚀", "♦️"];
  const hash = canonical.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return emojis[hash % emojis.length];
}

/** Faint mini sparkline; optional points (e.g. from price history), else placeholder. */
function SparklineSvg({ points: rawPoints, isUp = true }: { points?: number[]; isUp?: boolean }) {
  const points = rawPoints && rawPoints.length > 1
    ? rawPoints
    : [8, 12, 10, 14, 18, 15, 22, 20, 24, 28];
  const w = 64;
  const h = 24;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const pad = 2;
  const xs = points.map((_, i) => (i / (points.length - 1)) * (w - pad * 2) + pad);
  const ys = points.map((p) => h - pad - ((p - min) / range) * (h - pad * 2));
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ");
  return (
    <svg
      className="shrink-0 overflow-visible opacity-60"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      fill="none"
      aria-hidden
    >
      <path
        d={d}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={isUp ? "text-emerald-400/50" : "text-chaos-tradeDown/50"}
      />
    </svg>
  );
}

/**
 * Design system: ChaotixCard base (rounded-2xl border-white/5 bg-slate-900/40 p-6),
 * hover:border-emerald-500/20. Market name text-slate-100 font-semibold;
 * stats text-slate-400 text-sm; positive emerald-400, negative chaos-tradeDown.
 */
export function MarketCard({ market }: { market: Market }) {
  const momentum = market.priceChange ?? 0;
  const isUp = momentum > 0;
  const isDown = momentum < 0;
  const emoji = marketEmoji(market.canonical);
  const nsi = market.price;
  const tradersLabel = market.uniqueTraders24h != null ? market.uniqueTraders24h : market.tradeCount;

  return (
    <Link
      href={`/market/${encodeURIComponent(market.canonical)}`}
      className={clsx(
        "block rounded-2xl border border-white/5 bg-slate-900/40 p-4 md:p-6 transition-all transition-transform duration-200",
        "hover:scale-[1.02] hover:border-emerald-500/20 focus-within:border-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      )}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-800/80 text-lg">
          {emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-base font-semibold text-slate-100">{market.displayName}</h3>
            <span
              className={clsx(
                "shrink-0 text-xs font-mono tabular-nums",
                isUp && "text-emerald-400",
                isDown && "text-chaos-tradeDown",
                !isUp && !isDown && "text-slate-500"
              )}
              aria-label="24h momentum"
            >
              24h {isUp && "+"}
              {momentum.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 flex items-baseline flex-wrap gap-x-4 gap-y-1 text-sm text-slate-400">
            <span className="font-mono text-emerald-400" title={NSI_TITLE}>
              {nsi.toFixed(2)} Narrative Strength
            </span>
            <span className={clsx("tabular-nums", isUp && "text-emerald-400/90", isDown && "text-chaos-tradeDown/90")}>
              {isUp && "+"}
              {momentum.toFixed(1)}% 24h
            </span>
            <span>{tradersLabel} traders</span>
            <span>${market.volume.toFixed(0)} vol</span>
          </div>
          {(market.category || (market.tags && market.tags.length > 0)) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {market.category && (
                <Link
                  href={`/category/${market.category.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-400 transition-colors hover:bg-emerald-500/20 hover:text-emerald-400"
                >
                  {market.category.name}
                </Link>
              )}
              {marketTags(market.tags).slice(0, 5).map((tag) => (
                <Link
                  key={tag}
                  href={`/discover?tag=${encodeURIComponent(tag)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-slate-500 transition-colors hover:bg-emerald-500/20 hover:text-emerald-400"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-end">
        <SparklineSvg isUp={!isDown} />
      </div>
    </Link>
  );
}
