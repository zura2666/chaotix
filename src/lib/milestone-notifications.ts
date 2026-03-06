/**
 * Milestone notifications for traders (100/500/1000 trades) and LPs.
 */

import { prisma } from "./db";
import { createNotification } from "./notifications";

const TRADE_MILESTONES = [100, 500, 1000];
const LP_MILESTONES = [10, 50, 100]; // LP reward events or top contributor thresholds

export async function tryMilestoneTradeNotification(userId: string): Promise<void> {
  try {
    const count = await prisma.trade.count({ where: { userId } });
    if (!TRADE_MILESTONES.includes(count)) return;
    await createNotification({
      userId,
      type: "milestone_trades",
      title: `You hit ${count} trades!`,
      body: `Congratulations on reaching ${count} trades on Chaotix.`,
      link: "/portfolio",
      payload: { milestone: count, type: "trades" },
    });
  } catch {
    // ignore
  }
}

export async function tryMilestoneLpNotification(userId: string, rewardAmount: number, marketId: string): Promise<void> {
  try {
    const count = await prisma.liquidityReward.count({ where: { userId } });
    if (!LP_MILESTONES.includes(count)) return;
    await createNotification({
      userId,
      type: "milestone_lp",
      title: `LP milestone: ${count} rewards received`,
      body: `You've received ${count} liquidity provider rewards. Latest: ${rewardAmount.toFixed(2)}.`,
      link: "/portfolio",
      payload: { milestone: count, marketId, latestAmount: rewardAmount },
    });
  } catch {
    // ignore
  }
}

export async function notifyLpReward(userId: string, amount: number, marketId: string, reason: string): Promise<void> {
  try {
    await createNotification({
      userId,
      type: "lp_reward",
      title: "LP reward distributed",
      body: `You received ${amount.toFixed(2)} from ${reason}.`,
      link: "/portfolio",
      payload: { amount, marketId, reason },
    });
  } catch {
    // ignore
  }
}
