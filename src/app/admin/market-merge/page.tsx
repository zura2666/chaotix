import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { conceptSimilarity } from "@/lib/market-concept";
import { CONCEPT_SIMILARITY_THRESHOLD } from "@/lib/constants";

export default async function AdminMarketMergePage() {
  const user = await getSession();
  if (!user?.isAdmin) redirect("/");

  const markets = await prisma.market.findMany({
    where: { status: "active" },
    select: { id: true, canonical: true, displayName: true, volume: true, tradeCount: true },
    orderBy: { volume: "desc" },
    take: 200,
  });

  const pairs: Array<{ a: { canonical: string; displayName: string }; b: { canonical: string; displayName: string }; similarity: number }> = [];
  for (let i = 0; i < markets.length; i++) {
    for (let j = i + 1; j < markets.length; j++) {
      const sim = conceptSimilarity(markets[i].canonical, markets[j].canonical);
      if (sim >= CONCEPT_SIMILARITY_THRESHOLD) {
        pairs.push({
          a: { canonical: markets[i].canonical, displayName: markets[i].displayName },
          b: { canonical: markets[j].canonical, displayName: markets[j].displayName },
          similarity: sim,
        });
      }
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/admin" className="mb-6 inline-block text-sm text-slate-500 hover:text-emerald-400">
        Admin
      </Link>
      <h1 className="mb-8 text-2xl font-bold text-white">Market merge</h1>
      <p className="mb-6 text-slate-500">
        Pairs with similarity at least {CONCEPT_SIMILARITY_THRESHOLD}. Merge is manual.
      </p>
      {pairs.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-slate-900/40 p-6 text-slate-500">
          No similar pairs.
        </p>
      ) : (
        <ul className="space-y-3">
          {pairs.map((p, i) => (
            <li key={i} className="rounded-xl border border-white/10 bg-slate-900/40 p-4">
              <span className="text-white">{p.a.displayName}</span>
              <span className="mx-2 text-slate-500">and</span>
              <span className="text-white">{p.b.displayName}</span>
              <span className="ml-2 font-mono text-emerald-400">{(p.similarity * 100).toFixed(0)}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
