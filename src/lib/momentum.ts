/**
 * Market momentum score: trades, growth, unique holders, engagement (comments).
 */

import { prisma } from "./db";
import { updateMarketGravityScore } from "./gravity";

const VELOCITY_WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

export async function updateMarketMomentum(marketId: string): Promise<void> {
  const [market, recentTrades, commentCount] = await Promise.all([
    prisma.market.findUnique({
      where: { id: marketId },
      select: {
        volume: true,
        tradeCount: true,
        reserveTokens: true,
        createdAt: true,
        lastTradeAt: true,
      },
    }),
    prisma.trade.count({
      where: {
        marketId,
        createdAt: { gte: new Date(Date.now() - VELOCITY_WINDOW_MS) },
      },
    }),
    prisma.marketComment.count({ where: { marketId } }),
  ]);
  if (!market || market.tradeCount === 0) return;

  const uniqueHolders = await prisma.position.count({
    where: { marketId, shares: { gt: 0 } },
  });
  const ageHours = (Date.now() - market.createdAt.getTime()) / (60 * 60 * 1000);
  const recency = market.lastTradeAt
    ? Math.exp(-(Date.now() - market.lastTradeAt.getTime()) / (12 * 60 * 60 * 1000))
    : 0;

  const score =
    Math.log(1 + market.volume) * 2 +
    market.tradeCount * 0.5 +
    recentTrades * 1.5 +
    uniqueHolders * 2 +
    Math.log(1 + commentCount + 1) * 1 +
    recency * 3 +
    Math.min(ageHours / 168, 2) * 0.5; // cap age factor at 1 week

  await prisma.market.update({
    where: { id: marketId },
    data: { momentumScore: Math.round(score * 100) / 100 },
  });
  updateMarketGravityScore(marketId).catch(() => {});
}
