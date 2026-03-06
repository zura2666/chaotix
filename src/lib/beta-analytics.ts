/**
 * Beta analytics: retention (D1/D7), trades per user, markets per user, liquidity/attention growth, market survival.
 */

import { prisma } from "./db";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getBetaAnalytics() {
  const now = Date.now();
  const day1Ago = new Date(now - DAY_MS);
  const day7Ago = new Date(now - 7 * DAY_MS);

  const [totalUsers, usersWithTrade, firstTradeTimes, tradesPerUser, marketsPerUser, marketsAlive] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { trades: { some: {} } } }),
    prisma.trade.groupBy({
      by: ["userId"],
      _min: { createdAt: true },
    }),
    prisma.trade.groupBy({
      by: ["userId"],
      _count: true,
    }),
    prisma.market.groupBy({
      by: ["createdById"],
      where: { createdById: { not: null } },
      _count: true,
    }),
    prisma.market.count({
      where: { status: "active", lastTradeAt: { gte: day7Ago } },
    }),
  ]);

  const totalMarkets = await prisma.market.count();
  const survivalRate = totalMarkets > 0 ? (marketsAlive / totalMarkets) * 100 : 0;

  const firstTradeByUser = new Map(firstTradeTimes.map((t) => [t.userId, t._min.createdAt]));
  let day1Return = 0;
  let day7Return = 0;
  firstTradeByUser.forEach((firstAt) => {
    if (!firstAt) return;
    const firstTime = firstAt.getTime();
    const tradedAgainAfter1d = tradesPerUser.find((t) => {
      const first = firstTradeByUser.get(t.userId)?.getTime();
      return first && first <= now - DAY_MS;
    });
    if (firstTime <= now - DAY_MS) day1Return++;
    if (firstTime <= now - 7 * DAY_MS) day7Return++;
  });

  const activeTraders = usersWithTrade;
  const avgTradesPerUser = activeTraders > 0
    ? tradesPerUser.reduce((s, t) => s + t._count, 0) / activeTraders
    : 0;
  const creatorsCount = marketsPerUser.length;
  const avgMarketsPerCreator = creatorsCount > 0
    ? marketsPerUser.reduce((s, m) => s + m._count, 0) / creatorsCount
    : 0;

  const [liquidityGrowth, attentionRecent] = await Promise.all([
    prisma.market.aggregate({
      _sum: { reserveTokens: true },
      where: { status: "active" },
    }),
    prisma.attentionSignal.aggregate({
      _sum: { attentionScore: true },
      where: { createdAt: { gte: day1Ago } },
    }),
  ]);

  return {
    retention: {
      totalUsers,
      activeTraders: usersWithTrade,
      day1Eligible: day1Return,
      day7Eligible: day7Return,
    },
    tradesPerUser: Math.round(avgTradesPerUser * 100) / 100,
    marketsPerUser: Math.round(avgMarketsPerCreator * 100) / 100,
    liquidityTotal: liquidityGrowth._sum.reserveTokens ?? 0,
    attentionGrowthLast24h: attentionRecent._sum.attentionScore ?? 0,
    marketSurvivalRate: Math.round(survivalRate * 10) / 10,
    totalMarkets,
    marketsAliveLast7d: marketsAlive,
  };
}
