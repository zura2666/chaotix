/**
 * Internal analytics events and advanced analytics (Phase 7).
 */

import { prisma } from "./db";

export async function trackEvent(
  name: string,
  opts: { userId?: string; marketId?: string; payload?: Record<string, unknown> }
) {
  try {
    await prisma.analyticsEvent.create({
      data: {
        name,
        userId: opts.userId,
        marketId: opts.marketId,
        payload: opts.payload ? JSON.stringify(opts.payload) : null,
      },
    });
  } catch (e) {
    console.error("Analytics track failed", e);
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** User retention: cohort of users who signed up 7d ago and traded again in last 7d. */
export async function getUserRetention() {
  const now = Date.now();
  const cohortStart = new Date(now - 14 * DAY_MS);
  const cohortEnd = new Date(now - 7 * DAY_MS);
  const windowStart = new Date(now - 7 * DAY_MS);
  const signedUp = await prisma.user.findMany({
    where: { createdAt: { gte: cohortStart, lt: cohortEnd } },
    select: { id: true },
  });
  const userIds = signedUp.map((u) => u.id);
  if (userIds.length === 0) return { cohortSize: 0, retained: 0, rate: 0 };
  const tradedAgain = await prisma.trade.findMany({
    where: { userId: { in: userIds }, createdAt: { gte: windowStart } },
    select: { userId: true },
    distinct: ["userId"],
  });
  const retained = tradedAgain.length;
  return {
    cohortSize: userIds.length,
    retained,
    rate: userIds.length ? (retained / userIds.length) * 100 : 0,
  };
}

/** Trade velocity: trades per day over last 14 days. */
export async function getTradeVelocity() {
  const since = new Date(Date.now() - 14 * DAY_MS);
  const trades = await prisma.trade.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });
  const byDay = new Map<string, number>();
  for (const t of trades) {
    const day = t.createdAt.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  return Array.from(byDay.entries())
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day));
}

/** Liquidity velocity: LP activity in last 7d. */
export async function getLiquidityVelocity() {
  const since = new Date(Date.now() - 7 * DAY_MS);
  const positions = await prisma.liquidityPosition.findMany({
    where: { updatedAt: { gte: since } },
    select: { tokensDeposited: true, sharesDeposited: true },
  });
  const totalActivity = positions.reduce(
    (s, p) => s + (p.tokensDeposited ?? 0) + (p.sharesDeposited ?? 0),
    0
  );
  return { totalLpActivity: totalActivity, lpUpdatesCount: positions.length };
}

/** Market churn: new vs dead (no trade 30d) markets. */
export async function getMarketChurn() {
  const since = new Date(Date.now() - 30 * DAY_MS);
  const [newMarkets, allMarkets, deadCandidates] = await Promise.all([
    prisma.market.count({ where: { createdAt: { gte: since } } }),
    prisma.market.count(),
    prisma.market.findMany({
      where: { lastTradeAt: { lt: since } },
      select: { id: true },
    }),
  ]);
  const dead = deadCandidates.length;
  return {
    newMarketsLast30d: newMarkets,
    totalMarkets: allMarkets,
    deadMarketsNoTrade30d: dead,
  };
}

/** Creator performance: top creators by rewards and market success. */
export async function getCreatorPerformance(limit = 20) {
  const rewards = await prisma.creatorReward.groupBy({
    by: ["userId"],
    _sum: { reward: true },
    _count: true,
  });
  const userIds = rewards.map((r) => r.userId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, marketsCreated: true, successfulMarkets: true },
  });
  const byId = new Map(users.map((u) => [u.id, u]));
  return rewards
    .map((r) => ({
      user: byId.get(r.userId),
      totalRewards: r._sum.reward ?? 0,
      rewardCount: r._count,
      marketsCreated: byId.get(r.userId)?.marketsCreated ?? 0,
      successfulMarkets: byId.get(r.userId)?.successfulMarkets ?? 0,
    }))
    .sort((a, b) => b.totalRewards - a.totalRewards)
    .slice(0, limit);
}

export async function getAdvancedAnalytics() {
  const [retention, tradeVelocity, liquidityVelocity, churn, creators] =
    await Promise.all([
      getUserRetention(),
      getTradeVelocity(),
      getLiquidityVelocity(),
      getMarketChurn(),
      getCreatorPerformance(20),
    ]);
  return {
    userRetention: retention,
    tradeVelocity,
    liquidityVelocity,
    marketChurn: churn,
    creatorPerformance: creators,
  };
}
