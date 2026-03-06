import {
  getTrendingMarketsCached,
  getNewestMarketsCached,
  getBiggestMoversCached,
} from "@/lib/trending";
import { getGravityMarkets } from "@/lib/gravity";
import { getTrendingByCategorySlug } from "@/lib/category-discovery";
import { getTrendingClustersCached } from "@/lib/narrative-clusters";
import { getNarrativeDiscoverySectionsCached } from "@/lib/narrative-discovery";
import { HomeContent } from "./HomeContent";

export default async function HomePage() {
  const [
    trending,
    newest,
    movers,
    gravityMarkets,
    trendingClusters,
    narrativeSections,
    trendingPolitics,
    trendingCrypto,
    trendingSports,
    trendingCelebrities,
  ] = await Promise.all([
    getTrendingMarketsCached(10),
    getNewestMarketsCached(10),
    getBiggestMoversCached(10),
    getGravityMarkets(6),
    getTrendingClustersCached(6),
    getNarrativeDiscoverySectionsCached(6),
    getTrendingByCategorySlug("politics", 5),
    getTrendingByCategorySlug("crypto", 5),
    getTrendingByCategorySlug("sports", 5),
    getTrendingByCategorySlug("celebrities", 5),
  ]);

  const toHomeMarket = (m: {
    id: string;
    canonical: string;
    displayName: string;
    title: string | null;
    price: number;
    volume: number;
    tradeCount: number;
    tags: string;
    category?: { slug: string; name: string } | null;
    priceChange?: number;
    uniqueTraders24h?: number;
    uniqueTraders?: number;
  }) => {
    let tags: string[] = [];
    try {
      const t = JSON.parse(m.tags);
      tags = Array.isArray(t) ? t : [];
    } catch {
      // ignore
    }
    return {
      id: m.id,
      canonical: m.canonical,
      displayName: m.displayName,
      price: m.price,
      volume: m.volume,
      tradeCount: m.tradeCount,
      priceChange: m.priceChange,
      uniqueTraders24h: m.uniqueTraders24h ?? (m as { uniqueTraders?: number }).uniqueTraders,
      category: m.category,
      tags,
    };
  };

  const toNarrativeMarket = (m: (typeof narrativeSections.narrativesExploding)[number]) => ({
    id: m.id,
    canonical: m.canonical,
    displayName: m.displayName,
    price: m.price,
    volume: m.volume,
    tradeCount: m.tradeCount,
    priceChange: m.priceChange24h != null ? m.priceChange24h * 100 : undefined,
    uniqueTraders24h: m.uniqueTraders24h,
    category: m.category ?? undefined,
    tags: typeof m.tags === "string" ? (() => { try { const t = JSON.parse(m.tags); return Array.isArray(t) ? t : []; } catch { return []; } })() : [],
  });

  return (
    <HomeContent
      trending={trending.map(toHomeMarket)}
      newest={newest}
      movers={movers}
      gravityMarkets={gravityMarkets}
      trendingClusters={trendingClusters}
      narrativesExploding={narrativeSections.narrativesExploding.map(toNarrativeMarket)}
      narrativesRising={narrativeSections.narrativesRising.map(toNarrativeMarket)}
      narrativesFalling={narrativeSections.narrativesFalling.map(toNarrativeMarket)}
      mostTradedNarratives={narrativeSections.mostTradedNarratives.map(toNarrativeMarket)}
      trendingInPolitics={trendingPolitics.map(toHomeMarket)}
      trendingInCrypto={trendingCrypto.map(toHomeMarket)}
      trendingInSports={trendingSports.map(toHomeMarket)}
      trendingInCelebrities={trendingCelebrities.map(toHomeMarket)}
    />
  );
}
