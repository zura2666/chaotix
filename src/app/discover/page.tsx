import { getDiscoveryFeed } from "@/lib/discovery-feed";
import { getMarketsByTag } from "@/lib/category-discovery";
import { DiscoverContent } from "./DiscoverContent";

type Props = { searchParams: Promise<{ tag?: string; sort?: string }> };

export default async function DiscoverPage({ searchParams }: Props) {
  const params = await searchParams;
  const tag = params.tag?.trim().toLowerCase();

  const feed = tag
    ? (await getMarketsByTag(tag, 30)).map((m) => ({
        id: m.id,
        canonical: m.canonical,
        displayName: m.displayName,
        title: m.title,
        price: m.price,
        volume: m.volume,
        tradeCount: m.tradeCount,
        priceChange: m.priceChange24h ?? 0,
        feedScore: (m.volume24h ?? m.volume) + m.tradeCount,
        tags: m.tags,
        category: m.category,
      }))
    : await getDiscoveryFeed(30);

  return <DiscoverContent feed={feed} initialTag={tag || undefined} />;
}
