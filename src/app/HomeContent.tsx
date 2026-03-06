import Link from "next/link";
import { TrendingUp, Sparkles, Zap, Star, Layers, Flame, TrendingDown } from "lucide-react";
import { MarketCard } from "@/components/MarketCard";
import { ClusterCard } from "@/components/ClusterCard";
import { EmptyState } from "@/components/EmptyState";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { ChaotixButton } from "@/components/ui/ChaotixButton";

type Market = {
  id: string;
  canonical: string;
  displayName: string;
  price: number;
  volume: number;
  tradeCount: number;
  priceChange?: number;
  isVerified?: boolean;
  change?: number;
  uniqueTraders24h?: number;
  category?: { slug: string; name: string } | null;
  tags?: string[];
};

function SectionIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center [&>svg]:h-5 [&>svg]:w-5 [&>svg]:shrink-0">
      {children}
    </span>
  );
}

type ClusterForCard = {
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

type Props = {
  trending: Market[];
  newest: Market[];
  movers: Market[];
  gravityMarkets: Market[];
  trendingClusters?: ClusterForCard[];
  narrativesExploding?: Market[];
  trendingInPolitics?: Market[];
  trendingInCrypto?: Market[];
  trendingInSports?: Market[];
  trendingInCelebrities?: Market[];
};

function toCardMarket(m: Market & { priceChange?: number; change?: number; uniqueTraders?: number }) {
  return {
    id: m.id,
    canonical: m.canonical,
    displayName: m.displayName,
    price: m.price,
    volume: m.volume,
    tradeCount: m.tradeCount,
    priceChange: m.priceChange ?? m.change,
    uniqueTraders24h: m.uniqueTraders24h ?? m.uniqueTraders,
    category: m.category,
    tags: m.tags,
  };
}

export function HomeContent({
  trending,
  newest,
  movers,
  gravityMarkets,
  trendingClusters = [],
  narrativesExploding = [],
  narrativesRising = [],
  narrativesFalling = [],
  mostTradedNarratives = [],
  trendingInPolitics = [],
  trendingInCrypto = [],
  trendingInSports = [],
  trendingInCelebrities = [],
}: Props) {
  const categorySections: CategoryTrending[] = [
    { categoryName: "Politics", categorySlug: "politics", markets: trendingInPolitics },
    { categoryName: "Crypto", categorySlug: "crypto", markets: trendingInCrypto },
    { categoryName: "Sports", categorySlug: "sports", markets: trendingInSports },
    { categoryName: "Celebrities", categorySlug: "celebrities", markets: trendingInCelebrities },
  ].filter((s) => s.markets.length > 0);

  return (
    <div className="space-y-8 md:space-y-24">
      {/* Hero: design system headline typography, mobile-first clamp */}
      <section className="py-12 text-center md:py-20 lg:py-24">
        <h1 className="font-semibold tracking-tighter text-slate-100 text-[clamp(1.75rem,8vw,2.5rem)] md:text-[clamp(2rem,5vw,3.75rem)]">
          Trade <span className="text-white">Nothing</span>.{" "}
          Trade <span className="text-emerald-400 glow-neon">Everything</span>.
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-400">
          Strings. Attention. Speculation. One canonical market per idea.
        </p>
        {/* SearchBar parent has search-focal when pathname === "/" (in Header) */}
      </section>

      {trending.length > 0 && (
        <section>
          <div className="mb-4 md:mb-6 flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-200 md:text-xl">
              <SectionIcon>
                <TrendingUp className="text-emerald-400" strokeWidth={1.5} />
              </SectionIcon>
              Trending Overall
            </h2>
            <ChaotixButton href="/discover" variant="ghost" className="min-h-[44px] min-w-[44px]">
              View All
            </ChaotixButton>
          </div>
          <ChaotixCard as="div">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {trending.slice(0, 5).map((m) => (
                <MarketCard key={m.id} market={toCardMarket(m)} />
              ))}
            </div>
          </ChaotixCard>
        </section>
      )}

      {narrativesExploding.length > 0 && (
        <section>
          <div className="mb-4 md:mb-6 flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-200 md:text-xl">
              <SectionIcon>
                <Flame className="text-orange-400" strokeWidth={1.5} />
              </SectionIcon>
              Exploding Narratives
            </h2>
            <ChaotixButton href="/discover" variant="ghost" className="min-h-[44px] min-w-[44px]">
              View All
            </ChaotixButton>
          </div>
          <ChaotixCard as="div" className="overflow-hidden">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
              {narrativesExploding.slice(0, 5).map((m, i) => (
                <Link
                  key={m.id}
                  href={`/market/${encodeURIComponent(m.canonical)}`}
                  className={`block rounded-xl border transition-all hover:border-orange-400/50 hover:bg-white/[0.02] focus-visible:ring-2 focus-visible:ring-orange-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0F1A] ${
                    i < 2
                      ? "border-orange-400/30 bg-gradient-to-br from-orange-500/10 to-transparent p-4 sm:col-span-1"
                      : "border-white/10 p-4"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-100">{m.displayName}</p>
                      <p className="mt-0.5 font-mono text-lg text-emerald-400">{typeof m.price === "number" ? m.price.toFixed(2) : "—"}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Vol ${(m.volume ?? 0).toFixed(0)}
                        {(m as Market & { uniqueTraders24h?: number }).uniqueTraders24h != null && (
                          <> · {(m as Market & { uniqueTraders24h?: number }).uniqueTraders24h} traders 24h</>
                        )}
                      </p>
                    </div>
                    {i < 2 && (
                      <span className="shrink-0 rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-400">
                        Exploding
                      </span>
                    )}
                  </div>
                  {(m as Market & { priceChange?: number }).priceChange != null && (
                    <p className={`mt-2 text-xs font-medium ${(m as Market & { priceChange?: number }).priceChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {(m as Market & { priceChange?: number }).priceChange >= 0 ? "+" : ""}
                      {(m as Market & { priceChange?: number }).priceChange?.toFixed(1)}% 24h
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </ChaotixCard>
        </section>
      )}

      {narrativesRising.length > 0 && (
        <section>
          <div className="mb-4 md:mb-6 flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-200 md:text-xl">
              <SectionIcon>
                <TrendingUp className="text-emerald-400" strokeWidth={1.5} />
              </SectionIcon>
              Rising Narratives
            </h2>
            <ChaotixButton href="/discover" variant="ghost" className="min-h-[44px] min-w-[44px]">
              View All
            </ChaotixButton>
          </div>
          <ChaotixCard as="div">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {narrativesRising.slice(0, 6).map((m) => (
                <MarketCard key={m.id} market={toCardMarket(m as Market & { priceChange?: number; uniqueTraders?: number })} />
              ))}
            </div>
          </ChaotixCard>
        </section>
      )}

      {narrativesFalling.length > 0 && (
        <section>
          <div className="mb-4 md:mb-6 flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-200 md:text-xl">
              <SectionIcon>
                <TrendingDown className="text-red-400" strokeWidth={1.5} />
              </SectionIcon>
              Falling Narratives
            </h2>
            <ChaotixButton href="/discover" variant="ghost" className="min-h-[44px] min-w-[44px]">
              View All
            </ChaotixButton>
          </div>
          <ChaotixCard as="div">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {narrativesFalling.slice(0, 6).map((m) => (
                <MarketCard key={m.id} market={toCardMarket(m as Market & { priceChange?: number; uniqueTraders?: number })} />
              ))}
            </div>
          </ChaotixCard>
        </section>
      )}

      {mostTradedNarratives.length > 0 && (
        <section>
          <div className="mb-4 md:mb-6 flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-200 md:text-xl">
              <SectionIcon>
                <Zap className="text-amber-400" strokeWidth={1.5} />
              </SectionIcon>
              Most Traded Narratives
            </h2>
            <ChaotixButton href="/discover" variant="ghost" className="min-h-[44px] min-w-[44px]">
              View All
            </ChaotixButton>
          </div>
          <ChaotixCard as="div">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {mostTradedNarratives.slice(0, 6).map((m) => (
                <MarketCard key={m.id} market={toCardMarket(m as Market & { priceChange?: number; uniqueTraders?: number })} />
              ))}
            </div>
          </ChaotixCard>
        </section>
      )}

      {trendingClusters.length > 0 && (
        <section>
          <div className="mb-4 md:mb-6 flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-200 md:text-xl">
              <SectionIcon>
                <Layers className="text-amber-400" strokeWidth={1.5} />
              </SectionIcon>
              Trending Clusters
            </h2>
            <ChaotixButton href="/clusters" variant="ghost" className="min-h-[44px] min-w-[44px]">
              View All
            </ChaotixButton>
          </div>
          <ChaotixCard as="div">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {trendingClusters.slice(0, 6).map((c) => (
                <ClusterCard key={c.id} cluster={c} />
              ))}
            </div>
          </ChaotixCard>
        </section>
      )}

      {categorySections.map(({ categoryName, categorySlug, markets }) => (
        <section key={categorySlug}>
          <div className="mb-4 md:mb-6 flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-200 md:text-xl">
              <SectionIcon>
                <TrendingUp className="text-emerald-400" strokeWidth={1.5} />
              </SectionIcon>
              Trending in {categoryName}
            </h2>
            <ChaotixButton href={`/category/${categorySlug}`} variant="ghost" className="min-h-[44px] min-w-[44px]">
              View All
            </ChaotixButton>
          </div>
          <ChaotixCard as="div">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {markets.slice(0, 5).map((m) => (
                <MarketCard key={m.id} market={toCardMarket(m as Market & { priceChange?: number; change?: number })} />
              ))}
            </div>
          </ChaotixCard>
        </section>
      ))}

      {gravityMarkets.length > 0 && (
        <section>
          <div className="mb-4 md:mb-6 flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-200 md:text-xl">
              <SectionIcon>
                <Star className="text-amber-400" strokeWidth={1.5} />
              </SectionIcon>
              Gravity — markets taking off
            </h2>
            <ChaotixButton href="/discover" variant="ghost" className="min-h-[44px] min-w-[44px]">
              View All
            </ChaotixButton>
          </div>
          <ChaotixCard as="div">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {gravityMarkets.map((m) => (
                <MarketCard
                  key={m.id}
                  market={{
                    id: m.id,
                    canonical: m.canonical,
                    displayName: m.displayName + (m.isVerified ? " ✓" : ""),
                    price: m.price,
                    volume: m.volume,
                    tradeCount: m.tradeCount,
                  }}
                />
              ))}
            </div>
          </ChaotixCard>
        </section>
      )}

      <section>
        <div className="mb-4 md:mb-6 flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-200 md:text-xl">
            <SectionIcon>
              <Sparkles className="text-sky-400" strokeWidth={1.5} />
            </SectionIcon>
            Newest
          </h2>
          <ChaotixButton href="/discover" variant="ghost" className="min-h-[44px] min-w-[44px]">
            View All
          </ChaotixButton>
        </div>
        <ChaotixCard as="div">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {newest.length === 0 ? (
              <EmptyState
                title="No markets yet"
                description="Create the first market and set the trend."
                ctaLabel="Be the first to create a market"
              />
            ) : (
              newest.map((m) => <MarketCard key={m.id} market={m} />)
            )}
          </div>
        </ChaotixCard>
      </section>

      <section>
        <div className="mb-4 md:mb-6 flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-200 md:text-xl">
            <SectionIcon>
              <Zap className="text-amber-400" strokeWidth={1.5} />
            </SectionIcon>
            Biggest Movers
          </h2>
          <ChaotixButton href="/discover" variant="ghost" className="min-h-[44px] min-w-[44px]">
            View All
          </ChaotixButton>
        </div>
        <ChaotixCard as="div">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {movers.length === 0 ? (
              <EmptyState
                title="No narrative movement yet"
                description="Trade markets to generate volume and moves."
                ctaLabel="Be the first to create a market"
              />
            ) : (
              movers.map((m) => (
                <MarketCard
                  key={m.id}
                  market={{
                    ...m,
                    priceChange: m.change ?? m.priceChange,
                  }}
                />
              ))
            )}
          </div>
        </ChaotixCard>
      </section>
    </div>
  );
}
