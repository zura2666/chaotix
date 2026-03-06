/**
 * Phase 3: Demand signals and trending algorithm.
 * Demand Score = weighted(views, bids, volume, new buyers).
 * Trending Score = recent activity with time decay.
 */

import { prisma } from "./db";

const WINDOW_24H_MS = 24 * 60 * 60 * 1000;
const TREND_DECAY_LAMBDA = 0.15; // per hour; weight = exp(-lambda * hours_ago)

/** Record a page view for an asset. */
export async function recordAssetView(assetId: string, userId?: string | null): Promise<void> {
  await prisma.assetPageView.create({
    data: { assetId, userId: userId ?? null },
  });
}

/** Record a search that led to an asset. */
export async function recordAssetSearch(assetId: string, userId?: string | null, query?: string): Promise<void> {
  await prisma.assetSearch.create({
    data: { assetId, userId: userId ?? null, query: query ?? null },
  });
}

/** Record an external mention (e.g. from admin or webhook). */
export async function recordExternalMention(assetId: string, source?: string): Promise<void> {
  await prisma.assetExternalMention.create({
    data: { assetId, source: source ?? null },
  });
}

/** Time-decay weight: more recent = higher weight. */
function decayWeight(hoursAgo: number): number {
  return Math.exp(-TREND_DECAY_LAMBDA * hoursAgo);
}

/** Recompute all demand/trending metrics for an asset. */
export async function updateAssetDemandAndTrending(assetId: string): Promise<void> {
  const since = new Date(Date.now() - WINDOW_24H_MS);

  const [
    viewCount24h,
    searchCount24h,
    watcherCount,
    newBids24h,
    trades24h,
    mentions24h,
    pricePoints,
    uniqueBuyers24h,
  ] = await Promise.all([
    prisma.assetPageView.count({ where: { assetId, createdAt: { gte: since } } }),
    prisma.assetSearch.count({ where: { assetId, createdAt: { gte: since } } }),
    prisma.marketplaceWatchlist.count({ where: { assetId } }),
    prisma.assetBid.count({ where: { assetId, createdAt: { gte: since } } }),
    prisma.assetTrade.findMany({
      where: { assetId, createdAt: { gte: since } },
      select: { quantity: true, unitPrice: true, buyerId: true, createdAt: true },
    }),
    prisma.assetExternalMention.count({ where: { assetId, createdAt: { gte: since } } }),
    prisma.assetPricePoint.findMany({
      where: { assetId },
      orderBy: { timestamp: "desc" },
      take: 500,
      select: { price: true, timestamp: true },
    }),
    prisma.assetTrade.findMany({
      where: { assetId, createdAt: { gte: since } },
      select: { buyerId: true },
    }),
  ]);

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { currentPrice: true },
  });
  const currentPrice = asset?.currentPrice ?? 0;
  const price24hAgo = pricePoints.find((p) => p.timestamp < since)?.price ?? currentPrice;
  const priceChange24h =
    price24hAgo > 0 ? (currentPrice - price24hAgo) / price24hAgo : 0;

  const volume24h = trades24h.reduce((s, t) => s + t.quantity * t.unitPrice, 0);
  const tradeCount24h = trades24h.length;
  const newBuyers24h = new Set(trades24h.map((t) => t.buyerId)).size;

  // Demand Score: weighted combination (0–100)
  const demandRaw =
    Math.log1p(viewCount24h) * 2 +
    Math.log1p(searchCount24h) * 1.5 +
    Math.log1p(watcherCount) * 3 +
    Math.log1p(newBids24h) * 2 +
    Math.log1p(volume24h) * 0.5 +
    Math.log1p(newBuyers24h) * 4 +
    Math.log1p(mentions24h) * 5;
  const demandScore = Math.min(100, Math.round(demandRaw * 2));

  // Trending Score: time-decayed recent activity
  const now = Date.now();
  let trendingRaw = 0;
  for (const v of trades24h) {
    const hoursAgo = (now - v.createdAt.getTime()) / (60 * 60 * 1000);
    trendingRaw += decayWeight(hoursAgo) * (v.quantity * v.unitPrice) * 0.01;
  }
  const views = await prisma.assetPageView.findMany({
    where: { assetId, createdAt: { gte: since } },
    select: { createdAt: true },
  });
  for (const v of views) {
    const hoursAgo = (now - v.createdAt.getTime()) / (60 * 60 * 1000);
    trendingRaw += decayWeight(hoursAgo) * 2;
  }
  const bids = await prisma.assetBid.findMany({
    where: { assetId, createdAt: { gte: since } },
    select: { createdAt: true },
  });
  for (const b of bids) {
    const hoursAgo = (now - b.createdAt.getTime()) / (60 * 60 * 1000);
    trendingRaw += decayWeight(hoursAgo) * 5;
  }
  const newWatchers = await prisma.marketplaceWatchlist.findMany({
    where: { assetId, createdAt: { gte: since } },
    select: { createdAt: true },
  });
  for (const w of newWatchers) {
    const hoursAgo = (now - w.createdAt.getTime()) / (60 * 60 * 1000);
    trendingRaw += decayWeight(hoursAgo) * 10;
  }
  trendingRaw += Math.max(0, priceChange24h) * 50;
  const trendingScore = Math.min(100, Math.round(trendingRaw));

  await prisma.asset.update({
    where: { id: assetId },
    data: {
      demandScore: Math.max(0, demandScore),
      trendingScore: Math.max(0, trendingScore),
      volume24h,
      tradeCount24h,
      newBuyers24h,
      priceChange24h,
      viewCount24h,
      searchCount24h,
      watcherCount,
      newBids24h,
      externalMentions24h: mentions24h,
      rankingsUpdatedAt: new Date(),
    },
  });
}

/** Recompute demand/trending for all assets (call every few minutes). */
export async function updateAllDemandAndTrending(): Promise<{ updated: number }> {
  const ids = await prisma.asset.findMany({ select: { id: true } }).then((r) => r.map((a) => a.id));
  for (const id of ids) {
    await updateAssetDemandAndTrending(id).catch(() => {});
  }
  return { updated: ids.length };
}

/** Get rankings: trending, rising, most traded, highest volume, newly popular. */
export async function getTrendingAssets(limit = 20): Promise<
  { id: string; title: string; category: string; currentPrice: number; trendingScore: number; demandScore: number; volume24h: number; tradeCount24h: number; priceChange24h: number; createdAt: Date }[]
> {
  const list = await prisma.asset.findMany({
    orderBy: { trendingScore: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      category: true,
      currentPrice: true,
      trendingScore: true,
      demandScore: true,
      volume24h: true,
      tradeCount24h: true,
      priceChange24h: true,
      createdAt: true,
    },
  });
  return list;
}

export async function getRisingAssets(limit = 20): Promise<
  { id: string; title: string; category: string; currentPrice: number; priceChange24h: number; trendingScore: number }[]
> {
  const list = await prisma.asset.findMany({
    where: { tradeCount24h: { gt: 0 } },
    orderBy: { priceChange24h: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      category: true,
      currentPrice: true,
      priceChange24h: true,
      trendingScore: true,
    },
  });
  return list;
}

export async function getMostTradedAssets(limit = 20): Promise<
  { id: string; title: string; category: string; currentPrice: number; tradeCount24h: number; volume24h: number }[]
> {
  const list = await prisma.asset.findMany({
    orderBy: { tradeCount24h: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      category: true,
      currentPrice: true,
      tradeCount24h: true,
      volume24h: true,
    },
  });
  return list;
}

export async function getHighestVolumeAssets(limit = 20): Promise<
  { id: string; title: string; category: string; currentPrice: number; volume24h: number; tradeCount24h: number }[]
> {
  const list = await prisma.asset.findMany({
    orderBy: { volume24h: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      category: true,
      currentPrice: true,
      volume24h: true,
      tradeCount24h: true,
    },
  });
  return list;
}

export async function getNewlyPopularAssets(limit = 20): Promise<
  { id: string; title: string; category: string; currentPrice: number; demandScore: number; viewCount24h: number; watcherCount: number; createdAt: Date }[]
> {
  const list = await prisma.asset.findMany({
    where: { createdAt: { gte: new Date(Date.now() - 7 * WINDOW_24H_MS) } },
    orderBy: { demandScore: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      category: true,
      currentPrice: true,
      demandScore: true,
      viewCount24h: true,
      watcherCount: true,
      createdAt: true,
    },
  });
  return list;
}
