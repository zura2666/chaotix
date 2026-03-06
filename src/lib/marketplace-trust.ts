/**
 * Phase 4: Trust score, reputation levels, verification.
 */

import { prisma } from "./db";

export const REPUTATION_LEVELS = [
  { min: 0, max: 19, label: "New", short: "New" },
  { min: 20, max: 39, label: "Rising", short: "Rising" },
  { min: 40, max: 59, label: "Trusted", short: "Trusted" },
  { min: 60, max: 79, label: "Verified Trader", short: "Verified" },
  { min: 80, max: 100, label: "Elite", short: "Elite" },
] as const;

export type ReputationLevel = (typeof REPUTATION_LEVELS)[number];

export function getReputationLevel(trustScore: number): ReputationLevel {
  const clamped = Math.max(0, Math.min(100, Math.round(trustScore)));
  const level = REPUTATION_LEVELS.find((l) => clamped >= l.min && clamped <= l.max);
  return level ?? REPUTATION_LEVELS[0];
}

/** Compute marketplace trust score (0–100) from: completed trades (+), disputes lost (-), verification (+), avg feedback. */
export async function computeMarketplaceTrustScore(userId: string): Promise<number> {
  const [completedTrades, disputesAgainst, feedback, user] = await Promise.all([
    prisma.assetTrade.count({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    }),
    prisma.marketplaceDispute.findMany({
      where: {
        trade: { OR: [{ buyerId: userId }, { sellerId: userId }] },
        status: { not: "open" },
      },
      select: { status: true, trade: { select: { buyerId: true, sellerId: true } } },
    }),
    prisma.tradeFeedback.findMany({
      where: { toUserId: userId },
      select: { rating: true },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { marketplaceVerifiedAt: true },
    }),
  ]);

  let score = 0;
  score += Math.min(40, completedTrades * 2);
  const verifiedBonus = user?.marketplaceVerifiedAt ? 15 : 0;
  score += verifiedBonus;
  const avgRating = feedback.length
    ? feedback.reduce((s, f) => s + f.rating, 0) / feedback.length
    : 0;
  score += Math.min(25, (avgRating / 5) * 25);
  const disputesLost = disputesAgainst.filter((d) => {
    return (
      (d.status === "resolved_buyer" && d.trade.sellerId === userId) ||
      (d.status === "resolved_seller" && d.trade.buyerId === userId)
    );
  }).length;
  score -= Math.min(30, disputesLost * 10);
  return Math.max(0, Math.min(100, Math.round(score)));
}

/** Update and persist user's marketplace trust score and completed trades count. */
export async function updateUserMarketplaceTrust(userId: string): Promise<void> {
  const [score, completedTrades] = await Promise.all([
    computeMarketplaceTrustScore(userId),
    prisma.assetTrade.count({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    }),
  ]);
  await prisma.user.update({
    where: { id: userId },
    data: { marketplaceTrustScore: score, marketplaceCompletedTrades: completedTrades },
  });
}

/** Check if user is verified (Phase 4 badge). */
export function isMarketplaceVerified(user: { marketplaceVerifiedAt: Date | null }): boolean {
  return user.marketplaceVerifiedAt != null;
}

/** Creator is "verified" if user has marketplaceVerifiedAt set. */
export async function getCreatorTrustInfo(creatorId: string): Promise<{
  trustScore: number;
  reputationLevel: ReputationLevel;
  verified: boolean;
  completedTrades: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: creatorId },
    select: {
      marketplaceTrustScore: true,
      marketplaceVerifiedAt: true,
      marketplaceCompletedTrades: true,
    },
  });
  if (!user) {
    return {
      trustScore: 0,
      reputationLevel: REPUTATION_LEVELS[0],
      verified: false,
      completedTrades: 0,
    };
  }
  return {
    trustScore: user.marketplaceTrustScore,
    reputationLevel: getReputationLevel(user.marketplaceTrustScore),
    verified: user.marketplaceVerifiedAt != null,
    completedTrades: user.marketplaceCompletedTrades,
  };
}
