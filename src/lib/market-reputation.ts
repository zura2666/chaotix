/**
 * Market reputation: credibility scoring for markets.
 * reputationScore = traderCount*0.3 + tradeCount*0.2 + volumeScore*0.3 + ageScore*0.2
 */

import { prisma } from "./db";

const TRADER_WEIGHT = 0.3;
const TRADE_WEIGHT = 0.2;
const VOLUME_WEIGHT = 0.3;
const AGE_WEIGHT = 0.2;
const MAX_VOLUME_LOG = 20;
const MAX_AGE_DAYS = 365;

export async function updateMarketReputation(marketId: string): Promise<void> {
  const [market, uniqueTraders] = await Promise.all([
    prisma.market.findUnique({
      where: { id: marketId },
      select: { tradeCount: true, volume: true, createdAt: true },
    }),
    prisma.trade.groupBy({
      by: ["marketId"],
      where: { marketId },
      _count: { userId: true },
    }),
  ]);
  if (!market) return;

  const traderCount = uniqueTraders[0]?._count.userId ?? 0;
  const tradeCount = market.tradeCount ?? 0;
  const volumeScore = Math.min(MAX_VOLUME_LOG, Math.log(1 + (market.volume ?? 0)));
  const ageDays = (Date.now() - market.createdAt.getTime()) / (24 * 60 * 60 * 1000);
  const ageScore = Math.min(1, ageDays / MAX_AGE_DAYS);

  const reputationScore =
    traderCount * TRADER_WEIGHT +
    tradeCount * TRADE_WEIGHT +
    volumeScore * VOLUME_WEIGHT +
    ageScore * AGE_WEIGHT;

  await prisma.marketReputation.upsert({
    where: { marketId },
    create: {
      marketId,
      traderCount,
      tradeCount,
      volumeScore: Math.round(volumeScore * 100) / 100,
      ageScore: Math.round(ageScore * 100) / 100,
      reputationScore: Math.round(reputationScore * 100) / 100,
    },
    update: {
      traderCount,
      tradeCount,
      volumeScore: Math.round(volumeScore * 100) / 100,
      ageScore: Math.round(ageScore * 100) / 100,
      reputationScore: Math.round(reputationScore * 100) / 100,
    },
  });
}

export async function getMarketReputation(marketId: string) {
  return prisma.marketReputation.findUnique({
    where: { marketId },
  });
}
