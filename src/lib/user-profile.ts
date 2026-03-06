/**
 * Phase 9: Trader profile by username or id.
 */

import { prisma } from "./db";
import { getPortfolio } from "./portfolio";

const profileSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  referralCode: true,
  balance: true,
  reputationScore: true,
  successfulTrades: true,
  marketInfluenceScore: true,
  badges: true,
  trustScore: true,
  trustLevel: true,
  marketplaceVerifiedAt: true,
  marketplaceTrustScore: true,
  marketplaceCompletedTrades: true,
  marketsCreated: true,
  successfulMarkets: true,
  creatorRewardTier: true,
  creatorVolumeGenerated: true,
  createdAt: true,
};

export async function getProfileByUsername(username: string) {
  const user = await prisma.user.findFirst({
    where: { username: username.trim(), isBanned: false },
    select: profileSelect,
  });
  if (!user) {
    const byCode = await prisma.user.findFirst({
      where: { referralCode: username.trim(), isBanned: false },
      select: profileSelect,
    });
    return byCode ?? null;
  }
  return user;
}

export async function getProfileWithStats(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      ...profileSelect,
    },
  });
  if (!user) return null;
  const [portfolio, followerCount, followingCount, tradesAgg, topPerformingMarket] = await Promise.all([
    getPortfolio(userId),
    prisma.userFollow.count({ where: { followingId: userId } }),
    prisma.userFollow.count({ where: { followerId: userId } }),
    prisma.trade.aggregate({ where: { userId }, _sum: { total: true }, _count: true }),
    prisma.market.findFirst({
      where: { createdById: userId, status: "active" },
      orderBy: { volume: "desc" },
      select: { id: true, canonical: true, displayName: true, volume: true, tradeCount: true },
    }),
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
    topPerformingNarrative: topPerformingMarket
      ? {
          canonical: topPerformingMarket.canonical,
          displayName: topPerformingMarket.displayName,
          volume: topPerformingMarket.volume,
          tradeCount: topPerformingMarket.tradeCount,
        }
      : null,
  };
}
