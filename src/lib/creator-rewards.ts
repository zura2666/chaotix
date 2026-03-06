/**
 * Creator incentive system: market creators earn from platform fees and milestones.
 * Milestones: 100 trades, 500 trades, 1000 trades, 10k volume.
 * Rewards: profile badge, reputation increase, small balance reward.
 */

import { prisma } from "./db";
import {
  CREATOR_FEE_SHARE_PCT,
  CREATOR_MILESTONE_TRADES,
  CREATOR_MILESTONE_VOLUME,
  CREATOR_MILESTONE_BONUS,
  CREATOR_MILESTONE_REPUTATION,
} from "./constants";
import { awardBadgeUnchecked } from "./reputation";

/** Badge slugs per milestone for creator incentive. */
export const CREATOR_MILESTONE_BADGES: Record<string, string> = {
  milestone_100: "creator_100_trades",
  milestone_500: "creator_500_trades",
  milestone_1000: "creator_1000_trades",
  milestone_10k_volume: "creator_10k_volume",
};

/** Tier 1–4 for creator reward tier (higher = more milestones reached). */
function tierForReason(reason: string): number {
  if (reason === "milestone_100") return 1;
  if (reason === "milestone_500") return 2;
  if (reason === "milestone_1000") return 3;
  if (reason === "milestone_10k_volume") return 4;
  return 0;
}

export async function awardCreatorFeeShare(
  marketId: string,
  platformFeeAmount: number,
  _tradeId: string
): Promise<void> {
  if (platformFeeAmount <= 0) return;
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: { createdById: true },
  });
  if (!market?.createdById) return;
  const amount = (platformFeeAmount * CREATOR_FEE_SHARE_PCT) / 100;
  if (amount <= 0) return;
  await prisma.$transaction([
    prisma.creatorReward.create({
      data: {
        userId: market.createdById,
        marketId,
        reward: amount,
        reason: "fee_share",
      },
    }),
    prisma.user.update({
      where: { id: market.createdById },
      data: { balance: { increment: amount } },
    }),
  ]);
  refreshCreatorVolumeGenerated(market.createdById).catch(() => {});
}

/** Update creator's total volume generated (sum of volume of all markets they created). */
async function refreshCreatorVolumeGenerated(userId: string): Promise<void> {
  const sum = await prisma.market.aggregate({
    where: { createdById: userId },
    _sum: { volume: true },
  });
  const total = sum._sum.volume ?? 0;
  await prisma.user.update({
    where: { id: userId },
    data: { creatorVolumeGenerated: total },
  });
}

export async function checkCreatorMilestones(marketId: string): Promise<void> {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: { createdById: true, tradeCount: true, volume: true },
  });
  if (!market?.createdById) return;
  const creatorId = market.createdById;
  const existingReasons = await prisma.creatorReward.findMany({
    where: { marketId, userId: creatorId, reason: { startsWith: "milestone_" } },
    select: { reason: true },
  });
  const awarded = new Set(existingReasons.map((r) => r.reason));
  let maxTier = 0;

  const currentUser = await prisma.user.findUnique({
    where: { id: creatorId },
    select: { creatorRewardTier: true },
  });
  let newTier = currentUser?.creatorRewardTier ?? 0;

  for (const milestone of CREATOR_MILESTONE_TRADES) {
    if ((market.tradeCount ?? 0) >= milestone && !awarded.has(`milestone_${milestone}`)) {
      const reason = `milestone_${milestone}`;
      const badge = CREATOR_MILESTONE_BADGES[reason];
      const tier = tierForReason(reason);
      await prisma.$transaction([
        prisma.creatorReward.create({
          data: {
            userId: creatorId,
            marketId,
            reward: CREATOR_MILESTONE_BONUS,
            reason,
          },
        }),
        prisma.user.update({
          where: { id: creatorId },
          data: {
            balance: { increment: CREATOR_MILESTONE_BONUS },
            reputationScore: { increment: CREATOR_MILESTONE_REPUTATION },
            creatorRewardTier: Math.max(newTier, tier),
          },
        }),
      ]);
      newTier = Math.max(newTier, tier);
      if (badge) await awardBadgeUnchecked(creatorId, badge);
      awarded.add(reason);
    }
  }

  if ((market.volume ?? 0) >= CREATOR_MILESTONE_VOLUME && !awarded.has("milestone_10k_volume")) {
    const reason = "milestone_10k_volume";
    const badge = CREATOR_MILESTONE_BADGES[reason];
    await prisma.$transaction([
      prisma.creatorReward.create({
        data: {
          userId: creatorId,
          marketId,
          reward: CREATOR_MILESTONE_BONUS,
          reason,
        },
      }),
      prisma.user.update({
        where: { id: creatorId },
        data: {
          balance: { increment: CREATOR_MILESTONE_BONUS },
          reputationScore: { increment: CREATOR_MILESTONE_REPUTATION },
          creatorRewardTier: Math.max(newTier, 4),
        },
      }),
    ]);
    if (badge) await awardBadgeUnchecked(creatorId, badge);
    awarded.add(reason);
  }

  await refreshCreatorVolumeGenerated(creatorId);
}
