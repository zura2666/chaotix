/**
 * Market gravity: when a market crosses threshold, push it everywhere (homepage, discovery, highlight).
 */

import { prisma } from "./db";
import { GRAVITY_THRESHOLD } from "./constants";
import { getMarketHealthScore } from "./markets";
import { getMarketAttention } from "./attention";

export async function updateMarketGravityScore(marketId: string): Promise<number> {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: {
      volume: true,
      tradeCount: true,
      momentumScore: true,
      lastTradeAt: true,
      reserveTokens: true,
    },
  });
  if (!market || market.tradeCount === 0) return 0;

  const health = getMarketHealthScore({
    volume: market.volume,
    tradeCount: market.tradeCount,
    lastTradeAt: market.lastTradeAt,
  });
  const attention = await getMarketAttention(marketId);
  const uniqueTraders = await prisma.trade.groupBy({
    by: ["marketId"],
    where: { marketId },
    _count: { userId: true },
  });
  const traders = uniqueTraders[0]?._count.userId ?? 0;

  const score =
    Math.log(1 + market.volume) * 1.5 +
    market.tradeCount * 0.3 +
    (market.momentumScore ?? 0) * 0.5 +
    health * 2 +
    Math.log(1 + attention.attentionScore) +
    traders * 0.2;

  const rounded = Math.round(score * 100) / 100;
  await prisma.market.update({
    where: { id: marketId },
    data: { gravityScore: rounded },
  });
  if (rounded >= GRAVITY_THRESHOLD) {
    const { onGravityThresholdReached } = await import("./growth-triggers");
    onGravityThresholdReached(marketId).catch(() => {});
  }
  return rounded;
}

export function hasGravity(gravityScore: number): boolean {
  return gravityScore >= GRAVITY_THRESHOLD;
}

export async function getGravityMarkets(limit = 20) {
  return prisma.market.findMany({
    where: {
      status: "active",
      gravityScore: { gte: GRAVITY_THRESHOLD },
      tradeCount: { gt: 0 },
    },
    orderBy: { gravityScore: "desc" },
    take: limit,
    select: {
      id: true,
      canonical: true,
      displayName: true,
      price: true,
      volume: true,
      tradeCount: true,
      gravityScore: true,
      isVerified: true,
    },
  });
}
