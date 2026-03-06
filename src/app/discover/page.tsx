import { getDiscoveryFeed } from "@/lib/discovery-feed";
import { getMarketsByTag } from "@/lib/category-discovery";
import { getNarrativeDiscoverySectionsCached } from "@/lib/narrative-discovery";
import { DiscoverContent } from "./DiscoverContent";

type Props = { searchParams: Promise<{ tag?: string; sort?: string }> };

export default async function DiscoverPage({ searchParams }: Props) {
  const params = await searchParams;
  const tag = params.tag?.trim().toLowerCase();

  const [feed, narrativeSections] = await Promise.all([
    tag
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
      : getDiscoveryFeed(30),
    tag ? null : getNarrativeDiscoverySectionsCached(8),
  ]);

  return (
    <DiscoverContent
      feed={feed}
      initialTag={tag || undefined}
      narrativeSections={narrativeSections ?? undefined}
    />
  );
}
