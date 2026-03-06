import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getClusterBySlug,
  getTopMovers,
  getTopTraders,
} from "@/lib/narrative-clusters";
import { MarketCard } from "@/components/MarketCard";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { TrendingUp, Zap, Users, Activity } from "lucide-react";

type Props = { params: Promise<{ slug: string }> };

function toMarketCard(m: {
  id: string;
  canonical: string;
  displayName: string;
  price: number;
  volume: number;
  tradeCount: number;
  priceChange24h?: number | null;
  uniqueTraders24h?: number | null;
}) {
  return {
    id: m.id,
    canonical: m.canonical,
    displayName: m.displayName,
    price: m.price,
    volume: m.volume,
    tradeCount: m.tradeCount,
    priceChange: m.priceChange24h != null ? m.priceChange24h * 100 : undefined,
    uniqueTraders24h: m.uniqueTraders24h ?? undefined,
  };
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const cluster = await getClusterBySlug(slug);
  if (!cluster) return { title: "Cluster | Chaotix" };
  return {
    title: `${cluster.name} · Narrative Cluster | Chaotix`,
    description: cluster.description ?? `Markets in the ${cluster.name} narrative cluster.`,
  };
}

export default async function ClusterPage({ params }: Props) {
  const { slug } = await params;
  const cluster = await getClusterBySlug(slug);
  if (!cluster) notFound();

  const topMovers = getTopMovers(cluster, 5);
  const topTraders = getTopTraders(cluster, 5);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-0">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-emerald-400"
      >
        ← Home
      </Link>

      <header>
        <div className="flex items-center gap-3">
          {cluster.icon && (
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-slate-800/80 text-2xl">
              {cluster.icon}
            </span>
          )}
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-100 md:text-3xl">
              {cluster.name}
            </h1>
            {cluster.description && (
              <p className="mt-1 text-slate-400">{cluster.description}</p>
            )}
          </div>
        </div>
      </header>

      {/* Cluster metrics: CSI, narrative momentum, volume */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ChaotixCard as="div" className="flex items-center gap-3 p-4">
          <Zap className="h-5 w-5 shrink-0 text-emerald-400" strokeWidth={1.5} />
          <div>
            <p className="text-xs text-slate-500">Cluster Strength Index</p>
            <p className="font-mono text-lg font-semibold text-emerald-400">
              {cluster.clusterStrengthIndex.toFixed(2)}
            </p>
          </div>
        </ChaotixCard>
        <ChaotixCard as="div" className="flex items-center gap-3 p-4">
          <TrendingUp className="h-5 w-5 shrink-0 text-slate-500" strokeWidth={1.5} />
          <div>
            <p className="text-xs text-slate-500">Narrative momentum (24h)</p>
            <p
              className={`font-mono text-lg font-semibold ${
                cluster.narrativeMomentum > 0
                  ? "text-emerald-400"
                  : cluster.narrativeMomentum < 0
                  ? "text-red-400"
                  : "text-slate-100"
              }`}
            >
              {(cluster.narrativeMomentum * 100).toFixed(2)}%
            </p>
          </div>
        </ChaotixCard>
        <ChaotixCard as="div" className="flex items-center gap-3 p-4">
          <Activity className="h-5 w-5 shrink-0 text-slate-500" strokeWidth={1.5} />
          <div>
            <p className="text-xs text-slate-500">Total volume</p>
            <p className="font-mono text-lg font-semibold text-slate-100">
              ${cluster.totalVolume.toFixed(0)}
            </p>
          </div>
        </ChaotixCard>
        <ChaotixCard as="div" className="flex items-center gap-3 p-4">
          <Users className="h-5 w-5 shrink-0 text-slate-500" strokeWidth={1.5} />
          <div>
            <p className="text-xs text-slate-500">Markets</p>
            <p className="font-mono text-lg font-semibold text-slate-100">
              {cluster.markets.length}
            </p>
          </div>
        </ChaotixCard>
      </div>

      {/* Top movers */}
      {topMovers.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-200">Top movers</h2>
          <ChaotixCard as="div">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {topMovers.map((m) => (
                <MarketCard key={m.id} market={toMarketCard(m)} />
              ))}
            </div>
          </ChaotixCard>
        </section>
      )}

      {/* Top traders (markets with most unique traders 24h) */}
      {topTraders.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-200">Top traders</h2>
          <ChaotixCard as="div">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {topTraders.map((m) => (
                <MarketCard key={m.id} market={toMarketCard(m)} />
              ))}
            </div>
          </ChaotixCard>
        </section>
      )}

      {/* All markets in cluster */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-slate-200">All markets</h2>
        <ChaotixCard as="div">
          {cluster.markets.length === 0 ? (
            <p className="p-6 text-center text-slate-500">No markets in this cluster yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cluster.markets.map((m) => (
                <MarketCard key={m.id} market={toMarketCard(m)} />
              ))}
            </div>
          )}
        </ChaotixCard>
      </section>
    </div>
  );
}
