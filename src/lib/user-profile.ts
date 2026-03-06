/**
 * Phase 9: Trader profile by username or id.
 */

import { prisma } from "./db";
import { getPortfolio } from "./portfolio";

export async function getProfileByUsername(username: string) {
  const user = await prisma.user.findFirst({
    where: { username: username.trim(), isBanned: false },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      referralCode: true,
      balance: true,
      reputationScore: true,
      trustScore: true,
      trustLevel: true,
      marketsCreated: true,
      successfulMarkets: true,
      createdAt: true,
    },
  });
  if (!user) {
    const byCode = await prisma.user.findFirst({
      where: { referralCode: username.trim(), isBanned: false },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        referralCode: true,
        balance: true,
        reputationScore: true,
        trustScore: true,
        trustLevel: true,
        marketsCreated: true,
        successfulMarkets: true,
        createdAt: true,
      },
    });
    return byCode ?? null;
  }
  return user;
}

export async function getProfileWithStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      referralCode: true,
      reputationScore: true,
      trustScore: true,
      trustLevel: true,
      marketsCreated: true,
      successfulMarkets: true,
      createdAt: true,
    },
  });
  if (!user) return null;
  const [portfolio, followerCount, followingCount, tradesAgg] = await Promise.all([
    getPortfolio(userId),
    prisma.userFollow.count({ where: { followingId: userId } }),
    prisma.userFollow.count({ where: { followerId: userId } }),
    prisma.trade.aggregate({ where: { userId }, _sum: { total: true }, _count: true }),
  ]);
  const positions = await prisma.position.aggregate({
    where: { userId },
    _sum: { realizedPnL: true },
  });
  return {
    ...user,
    totalVolume: tradesAgg._sum.total ?? 0,
    tradeCount: tradesAgg._count,
    realizedPnL: positions._sum.realizedPnL ?? 0,
    portfolioValue: portfolio.totalValue,
    unrealizedPnL: portfolio.unrealizedPnL,
    followerCount,
    followingCount,
  };
}
