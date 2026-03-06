import {
  getTrendingMarketsCached,
  getNewestMarketsCached,
  getBiggestMoversCached,
} from "@/lib/trending";
import { getGravityMarkets } from "@/lib/gravity";
import { getTrendingByCategorySlug } from "@/lib/category-discovery";
import { HomeContent } from "./HomeContent";

export default async function HomePage() {
  const [
    trending,
    newest,
    movers,
    gravityMarkets,
    trendingPolitics,
    trendingCrypto,
    trendingSports,
    trendingCelebrities,
  ] = await Promise.all([
    getTrendingMarketsCached(10),
    getNewestMarketsCached(10),
    getBiggestMoversCached(10),
    getGravityMarkets(6),
    getTrendingByCategorySlug("politics", 5),
    getTrendingByCategorySlug("crypto", 5),
    getTrendingByCategorySlug("sports", 5),
    getTrendingByCategorySlug("celebrities", 5),
  ]);

  const toHomeMarket = (m: { id: string; canonical: string; displayName: string; title: string | null; price: number; volume: number; tradeCount: number; tags: string; category?: { slug: string; name: string } | null; priceChange?: number }) => {
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
      category: m.category,
      tags,
    };
  };

  return (
    <HomeContent
      trending={trending.map(toHomeMarket)}
      newest={newest}
      movers={movers}
      gravityMarkets={gravityMarkets}
      trendingInPolitics={trendingPolitics.map(toHomeMarket)}
      trendingInCrypto={trendingCrypto.map(toHomeMarket)}
      trendingInSports={trendingSports.map(toHomeMarket)}
      trendingInCelebrities={trendingCelebrities.map(toHomeMarket)}
    />
  );
}
