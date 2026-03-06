import { prisma } from "./db";
import { getMarketHealthScore } from "./markets";
import { MIN_INITIAL_BUY_TO_ACTIVATE, PUBLIC_LAUNCH_MODE, GRAVITY_THRESHOLD } from "./constants";
import { getMarketAttention } from "./attention";
import { MARKET_STATUS_ACTIVE } from "./constants";

const WINDOW_24H = 24 * 60 * 60 * 1000;
const WINDOW_1H = 60 * 60 * 1000;
// Phase 6: DiscoveryScore = volume_24h*0.4 + unique_traders*0.2 + price_momentum*0.2 + gravity_score*0.2
const DISCOVERY_VOLUME_WEIGHT = 0.4;
const DISCOVERY_TRADERS_WEIGHT = 0.2;
const DISCOVERY_MOMENTUM_WEIGHT = 0.2;
const DISCOVERY_GRAVITY_WEIGHT = 0.2;

let discoveryCache: { at: number; data: Array<Record<string, unknown>> } | null = null;
const DISCOVERY_CACHE_MS = 60 * 1000;

export async function getDiscoveryFeed(limit = 30) {
  if (discoveryCache && Date.now() - discoveryCache.at < DISCOVERY_CACHE_MS && discoveryCache.data.length >= limit) {
    return discoveryCache.data.slice(0, limit);
  }
  const since24 = new Date(Date.now() - WINDOW_24H);
  const since1h = new Date(Date.now() - WINDOW_1H);

  const markets = await prisma.market.findMany({
    where: {
      status: MARKET_STATUS_ACTIVE,
      tradeCount: { gt: 0 },
      volume: { gte: MIN_INITIAL_BUY_TO_ACTIVATE },
    },
    include: {
      trades: {
        where: { createdAt: { gte: since24 } },
        select: { total: true, userId: true, createdAt: true },
      },
      comments: { select: { id: true, sentiment: true } },
      priceHistory: { orderBy: { timestamp: "asc" }, take: 2 },
    },
    orderBy: { lastTradeAt: "desc" },
    take: limit * 3,
  });

  const withScores: Array<Record<string, unknown>> = [];
  for (const m of markets) {
    const recentVol = m.trades.reduce((s: number, t: { total: number }) => s + t.total, 0);
    const velocity1h = m.trades
      .filter((t: { createdAt: Date }) => t.createdAt >= since1h)
      .reduce((s: number, t: { total: number }) => s + t.total, 0);
    const uniqueTraders = new Set(m.trades.map((t: { userId: string }) => t.userId)).size;
    const priceChange =
      m.priceHistory.length >= 2 && m.priceHistory[0].price > 0
        ? ((m.price - m.priceHistory[0].price) / m.priceHistory[0].price) * 100
        : 0;
    const health = getMarketHealthScore({
      volume: m.volume,
      tradeCount: m.tradeCount,
      lastTradeAt: m.lastTradeAt,
    });
    const attention = await getMarketAttention(m.id);
    let bullish = 0,
      bearish = 0;
    m.comments.forEach((c: { sentiment: string | null }) => {
      if (c.sentiment === "bullish") bullish++;
      else if (c.sentiment === "bearish") bearish++;
    });
    const sentiment = bullish > bearish ? "bullish" : bearish > bullish ? "bearish" : "neutral";
    const gravityScore = (m as { gravityScore?: number }).gravityScore ?? 0;
    const priceMomentum = Math.abs(priceChange);
    const discoveryScore =
      recentVol * DISCOVERY_VOLUME_WEIGHT +
      uniqueTraders * DISCOVERY_TRADERS_WEIGHT +
      priceMomentum * DISCOVERY_MOMENTUM_WEIGHT +
      gravityScore * DISCOVERY_GRAVITY_WEIGHT;
    let feedScore =
      Math.log(1 + (m.momentumScore ?? 0)) * 2 +
      Math.log(1 + attention.attentionScore) * 1.5 +
      Math.log(1 + velocity1h) * 1.2 +
      uniqueTraders * 0.5 +
      health * 0.3 +
      Math.abs(priceChange) * 0.1;
    if (PUBLIC_LAUNCH_MODE && gravityScore >= GRAVITY_THRESHOLD) {
      feedScore *= 1.2;
    }

    withScores.push({
      id: m.id,
      canonical: m.canonical,
      displayName: m.displayName,
      title: m.title,
      price: m.price,
      volume: m.volume,
      tradeCount: m.tradeCount,
      momentumScore: m.momentumScore,
      priceChange,
      liquidity: m.reserveTokens ?? 0,
      tradersCount: uniqueTraders,
      sentiment,
      attentionScore: attention.attentionScore,
      discoveryScore: Math.round(discoveryScore * 100) / 100,
      feedScore: Math.round(feedScore * 100) / 100,
    });
  }

  withScores.sort((a, b) => (b.discoveryScore as number) - (a.discoveryScore as number));
  const result = withScores.slice(0, limit);
  discoveryCache = { at: Date.now(), data: result };
  return result;
}
