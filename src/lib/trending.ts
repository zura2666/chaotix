import { prisma } from "./db";
import { getMarketHealthScore } from "./markets";
import { MIN_INITIAL_BUY_TO_ACTIVATE, MIN_HEALTH_SCORE_FOR_TRENDING } from "./constants";
import { getCached } from "./cache";

const TRENDING_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h
const VELOCITY_WINDOW_MS = 60 * 60 * 1000; // 1h for trade velocity

function hasMinActivity(m: { volume: number; tradeCount: number }): boolean {
  return m.tradeCount > 0 && m.volume >= MIN_INITIAL_BUY_TO_ACTIVATE;
}

export async function getTrendingMarkets(limit = 10) {
  const since = new Date(Date.now() - TRENDING_WINDOW_MS);
  const velocitySince = new Date(Date.now() - VELOCITY_WINDOW_MS);
  const markets = await prisma.market.findMany({
    where: {
      tradeCount: { gt: 0 },
      volume: { gte: MIN_INITIAL_BUY_TO_ACTIVATE },
    },
    include: {
      trades: {
        where: { createdAt: { gte: since } },
        select: { id: true, userId: true, total: true, side: true, createdAt: true },
      },
      priceHistory: {
        orderBy: { timestamp: "asc" },
        take: 2,
      },
    },
    orderBy: { tradeCount: "desc" },
    take: limit * 5,
  });

  const withScores = markets
    .filter(hasMinActivity)
    .map((m) => {
      const recentTrades = m.trades;
      const recentVolume = recentTrades.reduce((s, t) => s + t.total, 0);
      const uniqueTraders = new Set(recentTrades.map((t) => t.userId)).size;
      const recentVelocity = recentTrades.filter(
        (t) => t.createdAt >= velocitySince
      ).reduce((s, t) => s + t.total, 0);
      const prices = m.priceHistory;
      const priceChange =
        prices.length >= 2 && prices[0].price > 0
          ? ((prices[1].price - prices[0].price) / prices[0].price) * 100
          : 0;
      const marketAgeHours =
        (Date.now() - m.createdAt.getTime()) / (60 * 60 * 1000);
      const healthScore = getMarketHealthScore({
        volume: m.volume,
        tradeCount: m.tradeCount,
        lastTradeAt: m.lastTradeAt,
      });
      if (healthScore < MIN_HEALTH_SCORE_FOR_TRENDING) return null;
      const score =
        Math.log(1 + recentVolume) * 2.5 +
        uniqueTraders * 4 +
        Math.log(1 + recentVelocity) * 1.5 +
        Math.abs(priceChange) * 0.5 +
        m.tradeCount * 0.3 +
        Math.min(marketAgeHours / 24, 2) * 0.5;
      return {
        ...m,
        score,
        recentVolume,
        uniqueTraders,
        priceChange,
        recentVelocity,
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null);

  withScores.sort((a, b) => b.score - a.score);
  return withScores.slice(0, limit).map(
    ({ score, recentVolume, uniqueTraders, priceChange, recentVelocity, ...m }) => ({
      ...m,
      recentVolume,
      uniqueTraders,
      priceChange,
      recentVelocity,
    })
  );
}

export async function getNewestMarkets(limit = 10) {
  const markets = await prisma.market.findMany({
    where: {
      OR: [
        { tradeCount: { gt: 0 }, volume: { gte: MIN_INITIAL_BUY_TO_ACTIVATE } },
        { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit * 2,
  });
  return markets
    .filter((m) => m.tradeCount > 0 || m.createdAt.getTime() > Date.now() - 24 * 60 * 60 * 1000)
    .slice(0, limit);
}

export async function getBiggestMovers(limit = 10) {
  const markets = await prisma.market.findMany({
    where: {
      tradeCount: { gt: 0 },
      volume: { gte: MIN_INITIAL_BUY_TO_ACTIVATE },
    },
    include: {
      priceHistory: {
        orderBy: { timestamp: "asc" },
        take: 1,
      },
    },
    take: limit * 3,
  });
  const withChange = markets
    .filter((m) => m.priceHistory.length > 0 && m.priceHistory[0].price > 0)
    .map((m) => {
      const oldPrice = m.priceHistory[0].price;
      const change = ((m.price - oldPrice) / oldPrice) * 100;
      return { ...m, change };
    });
  withChange.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  return withChange.slice(0, limit);
}

const TRENDING_CACHE_TTL = 45 * 1000; // 45s

export async function getTrendingMarketsCached(limit = 10) {
  return getCached(
    `trending:${limit}`,
    () => getTrendingMarkets(limit),
    TRENDING_CACHE_TTL
  );
}

export async function getNewestMarketsCached(limit = 10) {
  return getCached(
    `newest:${limit}`,
    () => getNewestMarkets(limit),
    TRENDING_CACHE_TTL
  );
}

export async function getBiggestMoversCached(limit = 10) {
  return getCached(
    `movers:${limit}`,
    () => getBiggestMovers(limit),
    TRENDING_CACHE_TTL
  );
}
