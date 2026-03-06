import Link from "next/link";
import { clsx } from "clsx";

type Cluster = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  clusterStrengthIndex: number;
  narrativeMomentum: number;
  totalVolume: number;
  totalVolume24h: number;
  markets: { id: string }[];
};

export function ClusterCard({ cluster }: { cluster: Cluster }) {
  const momentum = cluster.narrativeMomentum * 100;
  const isUp = momentum > 0;
  const isDown = momentum < 0;

  return (
    <Link
      href={`/cluster/${encodeURIComponent(cluster.slug)}`}
      className={clsx(
        "block rounded-2xl border border-white/5 bg-slate-900/40 p-4 md:p-6 transition-all duration-200",
        "hover:scale-[1.02] hover:border-emerald-500/20 focus-within:border-emerald-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      )}
    >
      <div className="flex items-start gap-4">
        {cluster.icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-800/80 text-xl">
            {cluster.icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-slate-100">{cluster.name}</h3>
          {cluster.description && (
            <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{cluster.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm text-slate-400">
            <span className="font-mono text-emerald-400">
              {cluster.clusterStrengthIndex.toFixed(2)} CSI
            </span>
            <span
              className={clsx(
                "tabular-nums",
                isUp && "text-emerald-400",
                isDown && "text-red-400",
                !isUp && !isDown && "text-slate-500"
              )}
            >
              {isUp && "+"}
              {momentum.toFixed(1)}% 24h
            </span>
            <span>{cluster.markets.length} markets</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
