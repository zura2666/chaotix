/**
 * Narrative Discovery Engine: rank narratives by momentum and attention rather than only volume.
 *
 * GravityScore = (volume24h_norm * 0.35) + (uniqueTraders24h_norm * 0.25) + (priceMomentum_norm * 0.20) + (attentionVelocity_norm * 0.20)
 * Powers: Exploding, Rising, Falling, Most Traded discovery feeds.
 */

import { prisma } from "./db";
import { MIN_INITIAL_BUY_TO_ACTIVATE } from "./constants";
import { getCached } from "./cache";
import { discoveryWhere } from "./discovery-filter";

const VOLUME24H_CAP = 5000;
const TRADERS_CAP = 80;
const MOMENTUM_CAP = 0.2; // abs(priceChange24h) cap for norm

export type NarrativeMarket = {
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
};

function normalizeVolume24h(vol: number): number {
  return Math.min(1, Math.log(1 + Math.max(0, vol)) / Math.log(1 + VOLUME24H_CAP));
}

function normalizeTraders(n: number): number {
  return Math.min(1, Math.max(0, n) / TRADERS_CAP);
}

function normalizeAttentionVelocity(v: number): number {
  return Math.min(1, Math.max(0, (v ?? 0) + 0.5));
}

function normalizePriceMomentum(priceChange24h: number): number {
  return Math.min(1, Math.abs(priceChange24h ?? 0) / MOMENTUM_CAP);
}

/**
 * GravityScore = (volume24h * 0.35) + (uniqueTraders24h * 0.25) + (priceMomentum * 0.20) + (attentionVelocity * 0.20)
 * Components normalized to 0-1 so ranking reflects momentum and attention, not only volume.
 */
export function computeNarrativeGravityScore(
  volume24h: number,
  uniqueTraders24h: number,
  priceMomentum: number,
  attentionVelocity: number
): number {
  const v = normalizeVolume24h(volume24h) * 0.35;
  const t = normalizeTraders(uniqueTraders24h) * 0.25;
  const p = normalizePriceMomentum(priceMomentum) * 0.2;
  const a = normalizeAttentionVelocity(attentionVelocity) * 0.2;
  return Math.round((v + t + p + a) * 1000) / 1000;
}

async function getMarketsWithNarrativeScores(limit: number): Promise<NarrativeMarket[]> {
  const markets = await prisma.market.findMany({
    where: {
      ...discoveryWhere(),
      status: "active",
      tradeCount: { gt: 0 },
      volume: { gte: MIN_INITIAL_BUY_TO_ACTIVATE },
    },
    select: {
      id: true,
      canonical: true,
      displayName: true,
      title: true,
      price: true,
      narrativeScore: true,
      volume: true,
      volume24h: true,
      tradeCount: true,
      priceChange24h: true,
      momentumScore: true,
      uniqueTraders24h: true,
      attentionVelocity: true,
      createdAt: true,
      category: { select: { slug: true, name: true } },
      tags: true,
    },
    orderBy: { lastTradeAt: "desc" },
    take: limit,
  });

  return markets.map((m) => {
    const vol24h = m.volume24h ?? 0;
    const traders = m.uniqueTraders24h ?? 0;
    const attention = m.attentionVelocity ?? 0;
    const momentum = m.priceChange24h ?? 0;
    const gravityScore = computeNarrativeGravityScore(vol24h, traders, momentum, attention);
    return {
      id: m.id,
      canonical: m.canonical,
      displayName: m.displayName,
      title: m.title,
      price: m.price,
      narrativeScore: m.narrativeScore,
      volume: m.volume,
      volume24h: vol24h,
      tradeCount: m.tradeCount,
      priceChange24h: momentum,
      momentumScore: m.momentumScore ?? 0,
      uniqueTraders24h: traders,
      attentionVelocity: attention,
      gravityScore,
      createdAt: m.createdAt,
      category: m.category,
      tags: m.tags,
    };
  });
}

export type NarrativeDiscoverySections = {
  narrativesExploding: NarrativeMarket[];
  narrativesRising: NarrativeMarket[];
  narrativesFalling: NarrativeMarket[];
  mostTradedNarratives: NarrativeMarket[];
  newNarratives: NarrativeMarket[];
  mostControversial: NarrativeMarket[];
};

const NEW_NARRATIVE_DAYS = 7;
const CACHE_TTL_MS = 90 * 1000;

/**
 * Get all narrative discovery sections for API and homepage.
 * Exploding = high gravity + positive momentum. Rising = positive momentum. Falling = negative momentum. Most Traded = by volume24h.
 */
export async function getNarrativeDiscoverySections(
  limitPerSection = 10
): Promise<NarrativeDiscoverySections> {
  const markets = await getMarketsWithNarrativeScores(limitPerSection * 10);
  const now = Date.now();
  const newCutoff = new Date(now - NEW_NARRATIVE_DAYS * 24 * 60 * 60 * 1000);

  const withMomentumAbs = markets.map((m) => ({
    ...m,
    priceMomentumAbs: Math.abs(m.priceChange24h),
  }));

  const exploding = [...withMomentumAbs]
    .filter((m) => m.priceChange24h > 0 && (m.attentionVelocity ?? 0) >= 0 && m.volume24h >= 10)
    .sort((a, b) => b.gravityScore - a.gravityScore)
    .slice(0, limitPerSection)
    .map(({ priceMomentumAbs: _, ...m }) => m);

  const rising = [...withMomentumAbs]
    .filter((m) => m.priceChange24h > 0)
    .sort((a, b) => b.gravityScore - a.gravityScore)
    .slice(0, limitPerSection)
    .map(({ priceMomentumAbs: _, ...m }) => m);

  const falling = [...withMomentumAbs]
    .filter((m) => m.priceChange24h < 0)
    .sort((a, b) => b.gravityScore - a.gravityScore)
    .slice(0, limitPerSection)
    .map(({ priceMomentumAbs: _, ...m }) => m);

  const mostTraded = [...markets]
    .sort((a, b) => b.volume24h - a.volume24h)
    .filter((m) => m.volume24h > 0)
    .slice(0, limitPerSection);

  const newNarratives = [...markets]
    .filter((m) => m.createdAt >= newCutoff)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limitPerSection);

  const controversial = [...withMomentumAbs]
    .sort((a, b) => b.priceMomentumAbs - a.priceMomentumAbs)
    .filter((m) => m.volume24h >= 10)
    .slice(0, limitPerSection)
    .map(({ priceMomentumAbs: _, ...m }) => m);

  return {
    narrativesExploding: exploding,
    narrativesRising: rising,
    narrativesFalling: falling,
    mostTradedNarratives: mostTraded,
    newNarratives,
    mostControversial: controversial,
  };
}

export async function getNarrativeDiscoverySectionsCached(
  limitPerSection = 10
): Promise<NarrativeDiscoverySections> {
  return getCached(
    `narrative-discovery:${limitPerSection}`,
    () => getNarrativeDiscoverySections(limitPerSection),
    CACHE_TTL_MS
  );
}

/**
 * Trending markets ranked by narrative GravityScore (for homepage, discover, feeds).
 */
export async function getNarrativeTrendingMarkets(limit = 20): Promise<NarrativeMarket[]> {
  const markets = await getMarketsWithNarrativeScores(limit * 3);
  markets.sort((a, b) => b.gravityScore - a.gravityScore);
  return markets.slice(0, limit);
}

export async function getNarrativeTrendingMarketsCached(limit = 20): Promise<NarrativeMarket[]> {
  return getCached(
    `narrative-trending:${limit}`,
    () => getNarrativeTrendingMarkets(limit),
    CACHE_TTL_MS
  );
}
