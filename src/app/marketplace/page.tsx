import Link from "next/link";
import { Suspense } from "react";
import { listAssets, searchAssets } from "@/lib/marketplace";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { MarketplaceRankings } from "./MarketplaceRankings";
import { MarketplaceSearch } from "./MarketplaceSearch";

export const metadata = {
  title: "Marketplace · Chaotix",
  description: "Demand signals, trending algorithm, order-book trading. Rankings update every few minutes.",
};

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sortBy?: string; minPrice?: string; maxPrice?: string }>;
}) {
  const sp = await searchParams;
  const hasFilters = !!(sp.q || sp.category || sp.sortBy || sp.minPrice || sp.maxPrice);
  const assets = hasFilters
    ? await searchAssets({
        q: sp.q,
        category: sp.category,
        sortBy: sp.sortBy as "trending" | "volume" | "demand" | "liquidity" | "price" | "newest",
        minPrice: sp.minPrice ? parseFloat(sp.minPrice) : undefined,
        maxPrice: sp.maxPrice ? parseFloat(sp.maxPrice) : undefined,
        limit: 50,
      })
    : await listAssets({ limit: 50 });
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Marketplace</h1>
          <p className="mt-1 text-sm text-slate-400">
            Demand signals, trending algorithm, order-book trading. Rankings update every few minutes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/marketplace/leaderboard"
            className="rounded-lg bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            Leaderboard
          </Link>
          <Link
            href="/marketplace/feed"
            className="rounded-lg bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            Activity
          </Link>
          <Link
            href="/marketplace/watchlist"
            className="rounded-lg bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            Watchlist
          </Link>
          <Link
            href="/marketplace/portfolio"
            className="rounded-lg bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            Portfolio
          </Link>
          <Link
            href="/marketplace/trades"
            className="rounded-lg bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            Trade history
          </Link>
          <Link
            href="/marketplace/creator"
            className="rounded-lg bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10"
          >
            Creator dashboard
          </Link>
          <Link
            href="/marketplace/create"
            className="rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/30"
          >
            List asset
          </Link>
        </div>
      </div>

      <section className="mb-10">
        <MarketplaceRankings />
      </section>

      <Suspense fallback={null}>
        <MarketplaceSearch />
      </Suspense>
      <h2 className="mb-4 text-lg font-semibold text-white">{hasFilters ? "Search results" : "All assets"}</h2>
      {assets.length === 0 ? (
        <ChaotixCard as="div" className="p-10 text-center text-slate-500">
          <p>No assets yet. Create one to start trading.</p>
          <Link href="/marketplace/create" className="mt-2 inline-block text-emerald-400 hover:underline">
            List your first asset
          </Link>
        </ChaotixCard>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {assets.map((a) => {
            const creatorName = a.creator.name || a.creator.username || "Unknown";
            const trust = typeof a.creator.marketplaceTrustScore === "number" ? Math.round(a.creator.marketplaceTrustScore) : null;
            const verified = !!a.creator.marketplaceVerifiedAt;
            return (
              <li key={a.id}>
                <Link href={`/marketplace/${a.id}`}>
                  <ChaotixCard as="div" className="p-4 transition-colors hover:border-emerald-500/30">
                    <h2 className="font-semibold text-white truncate">{a.title}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">{a.category}</p>
                    <p className="mt-2 text-lg font-mono text-emerald-400">
                      {a.currentPrice > 0 ? a.currentPrice.toFixed(2) : "—"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span title="Liquidity score">Liq. {Math.round(a.liquidityScore)}</span>
                      <span>·</span>
                      <span>
                        by <span className="font-medium text-slate-200">{creatorName}</span>
                      </span>
                      {verified && (
                        <>
                          <span>·</span>
                          <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-emerald-400">Verified</span>
                        </>
                      )}
                      {typeof trust === "number" && (
                        <>
                          <span>·</span>
                          <span title="Marketplace trust score" className="font-mono">
                            Trust {trust}
                          </span>
                        </>
                      )}
                    </div>
                  </ChaotixCard>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
