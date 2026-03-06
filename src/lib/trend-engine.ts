/**
 * Phase 8: Trend prediction from attention velocity, trade acceleration, liquidity, social, price momentum.
 */

import { prisma } from "./db";
import { getMarketAttention } from "./attention";

const WINDOW_24H_MS = 24 * 60 * 60 * 1000;
const WINDOW_1H_MS = 60 * 60 * 1000;

export type TrendMarket = {
  marketId: string;
  canonical: string;
  displayName: string;
  trendScore: number;
  price: number;
  volume: number;
  tradeCount: number;
};

export async function computeTrendScore(marketId: string): Promise<number> {
  const [market, attention, trades24h, metrics, sentiment] = await Promise.all([
    prisma.market.findUnique({
      where: { id: marketId },
      select: {
        volume: true,
        tradeCount: true,
        price: true,
        reserveTokens: true,
        totalLpTokens: true,
        lastTradeAt: true,
      },
    }),
    getMarketAttention(marketId),
    prisma.trade.findMany({
      where: { marketId, createdAt: { gte: new Date(Date.now() - WINDOW_24H_MS) } },
      select: { total: true, createdAt: true },
    }),
    prisma.marketMetrics.findUnique({
      where: { marketId },
      select: { volume24h: true, traderCount24h: true, priceChange24h: true },
    }),
    prisma.marketSentiment.findUnique({
      where: { marketId },
      select: { bullishScore: true, bearishScore: true },
    }),
  ]);
  if (!market || market.tradeCount === 0) return 0;

  const attentionVelocity = attention.attentionVelocity ?? 0;
  const tradeAccel = trades24h.length;
  const volume24h = trades24h.reduce((s, t) => s + t.total, 0);
  const liquidityGrowth = market.totalLpTokens > 0 ? Math.log(1 + market.totalLpTokens) : 0;
  const social = (sentiment?.bullishScore ?? 0) - (sentiment?.bearishScore ?? 0);
  const priceMomentum = metrics?.priceChange24h ?? 0;

  const score =
    Math.log(1 + attentionVelocity + 1) * 2 +
    Math.log(1 + tradeAccel) * 1.5 +
    Math.log(1 + volume24h) * 1.2 +
    liquidityGrowth * 0.3 +
    Math.max(0, social) * 0.5 +
    (priceMomentum > 0 ? Math.min(priceMomentum * 10, 5) : 0);

  return Math.round(score * 100) / 100;
}

export async function getPredictedTrendingMarkets(limit = 20): Promise<TrendMarket[]> {
  const markets = await prisma.market.findMany({
    where: { status: "active", tradeCount: { gt: 0 } },
    select: { id: true, canonical: true, displayName: true, price: true, volume: true, tradeCount: true },
    orderBy: { tradeCount: "desc" },
    take: limit * 3,
  });
  const withScores = await Promise.all(
    markets.map(async (m) => ({
      ...m,
      trendScore: await computeTrendScore(m.id),
    }))
  );
  return withScores
    .filter((m) => m.trendScore > 0)
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, limit)
    .map(({ id, canonical, displayName, price, volume, tradeCount, trendScore }) => ({
      marketId: id,
      canonical,
      displayName,
      trendScore,
      price,
      volume,
      tradeCount,
    }));
}
