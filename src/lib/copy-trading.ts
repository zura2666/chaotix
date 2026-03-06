/**
 * Phase 9: Copy trading — mirror a trader's trades proportionally for followers.
 */

import { prisma } from "./db";
import { executeBuy, executeSell } from "./markets";

export async function getCopyTradersFollowers(traderId: string): Promise<{ followerId: string; allocation: number }[]> {
  const rows = await prisma.copyTrading.findMany({
    where: { traderId },
    select: { followerId: true, allocation: true },
  });
  return rows.map((r) => ({ followerId: r.followerId, allocation: r.allocation }));
}

/**
 * When trader executes a trade, optionally mirror for each copy-trading follower.
 * allocation = fraction of trader's trade size (0-1) to replicate.
 */
export async function mirrorTradeForCopyFollowers(params: {
  traderId: string;
  marketId: string;
  side: "buy" | "sell";
  amount: number;
  shares: number;
}): Promise<void> {
  const followers = await getCopyTradersFollowers(params.traderId);
  for (const { followerId, allocation } of followers) {
    if (allocation <= 0 || followerId === params.traderId) continue;
    try {
      if (params.side === "buy") {
        const mirrorAmount = Math.max(1, Math.round(params.amount * allocation));
        await executeBuy({ userId: followerId, marketId: params.marketId, amount: mirrorAmount });
      } else {
        const pos = await prisma.position.findUnique({
          where: { userId_marketId: { userId: followerId, marketId: params.marketId } },
          select: { shares: true },
        });
        const mirrorShares = Math.min(pos?.shares ?? 0, params.shares * allocation);
        if (mirrorShares >= 0.01) {
          await executeSell({ userId: followerId, marketId: params.marketId, shares: mirrorShares });
        }
      }
    } catch {
      // skip failed mirror
    }
  }
}
