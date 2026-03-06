import { NextRequest, NextResponse } from "next/server";
import { getNarrativeDiscoverySectionsCached } from "@/lib/narrative-discovery";

export type NarrativeDiscoveryItem = {
  canonical: string;
  narrativeStrength: number;
  momentumScore: number;
  gravityScore: number;
  uniqueTraders24h: number;
  volume24h: number;
  id: string;
  displayName: string;
  title: string | null;
  price: number;
  volume: number;
  tradeCount: number;
  priceChange24h: number;
  attentionVelocity: number;
  createdAt: string;
  category?: { slug: string; name: string } | null;
  tags?: string;
};

function serializeMarket(m: {
  id: string;
  canonical: string;
  displayName: string;
  title: string | null;
  price: number;
  narrativeScore?: number | null;
  volume: number;
  volume24h: number;
  tradeCount: number;
  priceChange24h: number;
  momentumScore: number;
  uniqueTraders24h: number;
  attentionVelocity: number;
  gravityScore: number;
  createdAt: Date;
  category?: { slug: string; name: string } | null;
  tags: string;
}): NarrativeDiscoveryItem {
  const narrativeStrength = m.narrativeScore ?? m.price;
  return {
    canonical: m.canonical,
    narrativeStrength,
    momentumScore: m.momentumScore,
    gravityScore: m.gravityScore,
    uniqueTraders24h: m.uniqueTraders24h,
    volume24h: m.volume24h,
    id: m.id,
    displayName: m.displayName,
    title: m.title,
    price: m.price,
    volume: m.volume,
    tradeCount: m.tradeCount,
    priceChange24h: m.priceChange24h,
    attentionVelocity: m.attentionVelocity,
    createdAt: m.createdAt.toISOString(),
    category: m.category,
    tags: typeof m.tags === "string" ? m.tags : undefined,
  };
}

/**
 * GET /api/discovery/narratives
 * Returns narrative discovery sections powered by GravityScore (volume24h, uniqueTraders24h, priceMomentum, attentionVelocity).
 * Response includes per item: canonical, narrativeStrength, momentumScore, gravityScore, uniqueTraders24h, volume24h.
 * Sections: exploding, rising, falling, mostTraded, newNarratives, mostControversial.
 * Query: limitPerSection (default 10)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limitPerSection = Math.min(
    25,
    Math.max(1, parseInt(searchParams.get("limitPerSection") ?? "10", 10) || 10)
  );
  const sections = await getNarrativeDiscoverySectionsCached(limitPerSection);
  return NextResponse.json({
    exploding: sections.narrativesExploding.map(serializeMarket),
    rising: sections.narrativesRising.map(serializeMarket),
    falling: sections.narrativesFalling.map(serializeMarket),
    mostTraded: sections.mostTradedNarratives.map(serializeMarket),
    newNarratives: sections.newNarratives.map(serializeMarket),
    mostControversial: sections.mostControversial.map(serializeMarket),
  });
}
