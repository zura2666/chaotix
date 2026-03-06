/**
 * Market gravity: narrative-based GravityScore (volume24h, uniqueTraders24h, priceMomentum, attentionVelocity).
 * When a market crosses threshold, push it everywhere (homepage, discovery, highlight).
 */

import { prisma } from "./db";
import { GRAVITY_THRESHOLD } from "./constants";
import { computeNarrativeGravityScore } from "./narrative-discovery";

export async function updateMarketGravityScore(marketId: string): Promise<number> {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: {
      tradeCount: true,
      volume24h: true,
      uniqueTraders24h: true,
      priceChange24h: true,
      attentionVelocity: true,
    },
  });
  if (!market || market.tradeCount === 0) return 0;

  const score = computeNarrativeGravityScore(
    market.volume24h ?? 0,
    market.uniqueTraders24h ?? 0,
    market.priceChange24h ?? 0,
    market.attentionVelocity ?? 0
  );
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
