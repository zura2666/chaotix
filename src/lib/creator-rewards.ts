/**
 * Creator economy: market creators earn from platform fees and milestones.
 */

import { prisma } from "./db";
import {
  CREATOR_FEE_SHARE_PCT,
  CREATOR_MILESTONE_TRADES,
  CREATOR_MILESTONE_BONUS,
} from "./constants";

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
}

export async function checkCreatorMilestones(marketId: string): Promise<void> {
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: { createdById: true, tradeCount: true },
  });
  if (!market?.createdById) return;
  const existingReasons = await prisma.creatorReward.findMany({
    where: { marketId, userId: market.createdById, reason: { startsWith: "milestone_" } },
    select: { reason: true },
  });
  const awarded = new Set(existingReasons.map((r) => r.reason));
  for (const milestone of CREATOR_MILESTONE_TRADES) {
    if ((market.tradeCount ?? 0) >= milestone && !awarded.has(`milestone_${milestone}`)) {
      await prisma.$transaction([
        prisma.creatorReward.create({
          data: {
            userId: market.createdById,
            marketId,
            reward: CREATOR_MILESTONE_BONUS,
            reason: `milestone_${milestone}`,
          },
        }),
        prisma.user.update({
          where: { id: market.createdById },
          data: { balance: { increment: CREATOR_MILESTONE_BONUS } },
        }),
      ]);
      awarded.add(`milestone_${milestone}`);
    }
  }
}
