import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { watchlistAssets } from "@/lib/marketplace";
import { ChaotixCard } from "@/components/ui/ChaotixCard";

export const metadata = {
  title: "Watchlist · Marketplace · Chaotix",
  description: "Assets you're watching.",
};

export default async function WatchlistPage() {
  const user = await getSession();
  if (!user) redirect("/api/auth/signin");

  const assets = await watchlistAssets(user.id);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link
        href="/marketplace"
        className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-emerald-400"
      >
        ← Marketplace
      </Link>
      <h1 className="text-2xl font-bold text-white">Watchlist</h1>
      <p className="mt-1 text-sm text-slate-400">Assets you're tracking. Open any to trade.</p>

      {assets.length === 0 ? (
        <ChaotixCard as="div" className="mt-6 p-10 text-center text-slate-500">
          <p>No assets on your watchlist. Add some from asset pages.</p>
          <Link href="/marketplace" className="mt-2 inline-block text-emerald-400 hover:underline">
            Browse marketplace
          </Link>
        </ChaotixCard>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {assets.map((a) => (
            <li key={a.id}>
              <Link href={`/marketplace/${a.id}`}>
                <ChaotixCard as="div" className="p-4 transition-colors hover:border-emerald-500/30">
                  <h2 className="font-semibold text-white truncate">{a.title}</h2>
                  <p className="mt-0.5 text-xs text-slate-500">{a.category}</p>
                  <p className="mt-2 text-lg font-mono text-emerald-400">
                    {a.currentPrice > 0 ? a.currentPrice.toFixed(2) : "—"}
                  </p>
                  <p className="text-xs text-slate-400">Liq. {Math.round(a.liquidityScore)}</p>
                </ChaotixCard>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
