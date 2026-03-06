import Link from "next/link";
import { TrendingUp, Sparkles, Zap, Star } from "lucide-react";
import { MarketCard } from "@/components/MarketCard";
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

type Props = {
  trending: Market[];
  newest: Market[];
  movers: Market[];
  gravityMarkets: Market[];
  trendingInPolitics?: Market[];
  trendingInCrypto?: Market[];
  trendingInSports?: Market[];
  trendingInCelebrities?: Market[];
};

function toCardMarket(m: Market & { priceChange?: number; change?: number }) {
  return {
    id: m.id,
    canonical: m.canonical,
    displayName: m.displayName,
    price: m.price,
    volume: m.volume,
    tradeCount: m.tradeCount,
    priceChange: m.priceChange ?? m.change,
    category: m.category,
    tags: m.tags,
  };
}

export function HomeContent({
  trending,
  newest,
  movers,
  gravityMarkets,
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
                title="No price movement yet"
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
