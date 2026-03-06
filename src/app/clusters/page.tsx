import Link from "next/link";
import { getTrendingClustersCached } from "@/lib/narrative-clusters";
import { ClusterCard } from "@/components/ClusterCard";
import { ChaotixCard } from "@/components/ui/ChaotixCard";

export const metadata = {
  title: "Narrative Clusters | Chaotix",
  description: "Related markets grouped by narrative for concentrated liquidity and discovery.",
};

export default async function ClustersPage() {
  const clusters = await getTrendingClustersCached(24);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 md:px-0">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-emerald-400"
      >
        ← Home
      </Link>
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100 md:text-3xl">
          Narrative Clusters
        </h1>
        <p className="mt-1 text-slate-400">
          Related markets grouped by narrative for concentrated liquidity and discovery.
        </p>
      </header>
      {clusters.length === 0 ? (
        <ChaotixCard as="div" className="p-8 text-center text-slate-500">
          No clusters yet. Run <code className="rounded bg-white/10 px-1.5 py-0.5">db:seed</code> to
          create example clusters.
        </ChaotixCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clusters.map((c) => (
            <ClusterCard key={c.id} cluster={c} />
          ))}
        </div>
      )}
    </div>
  );
}
