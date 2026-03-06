/**
 * Early market advantage: first N traders get fee discount, badge, leaderboard boost.
 */

import { prisma } from "./db";
import { EARLY_TRADER_LIMIT, EARLY_TRADER_FEE_DISCOUNT_BPS, TRADING_FEE_BPS } from "./constants";
import { awardBadge, updateReputationEarlyDiscovery } from "./reputation";

/**
 * Record early trader and return their rank (1 = first). If already recorded, returns existing rank.
 */
export async function recordEarlyTrader(marketId: string, userId: string): Promise<number | null> {
  const existing = await prisma.marketEarlyTrader.findUnique({
    where: { marketId_userId: { marketId, userId } },
    select: { rank: true },
  });
  if (existing) return existing.rank;

  const count = await prisma.marketEarlyTrader.count({ where: { marketId } });
  if (count >= EARLY_TRADER_LIMIT) return null;

  const rank = count + 1;
  await prisma.marketEarlyTrader.create({
    data: { marketId, userId, rank },
  });
  updateReputationEarlyDiscovery(userId).catch(() => {});
  if (rank <= 10) awardBadge(userId, "early_discoverer").catch(() => {});
  return rank;
}

/**
 * Fee discount for early traders: reduce fee by EARLY_TRADER_FEE_DISCOUNT_BPS (e.g. 5% off = 95 bps of 100).
 * Returns effective fee in bps (e.g. 95 instead of 100).
 */
export async function getEarlyTraderFeeBps(marketId: string, userId: string): Promise<number> {
  const early = await prisma.marketEarlyTrader.findUnique({
    where: { marketId_userId: { marketId, userId } },
    select: { rank: true },
  });
  if (!early) return TRADING_FEE_BPS;
  const discount = Math.min(EARLY_TRADER_FEE_DISCOUNT_BPS, TRADING_FEE_BPS - 10);
  return Math.max(10, TRADING_FEE_BPS - discount);
}

/**
 * Whether user is an early trader in this market (for UI / leaderboard boost).
 */
export async function isEarlyTrader(marketId: string, userId: string): Promise<{ rank: number } | null> {
  const row = await prisma.marketEarlyTrader.findUnique({
    where: { marketId_userId: { marketId, userId } },
    select: { rank: true },
  });
  return row ? { rank: row.rank } : null;
}
