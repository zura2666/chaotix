/**
 * Liquidity incentive engine: distribute rewards to LPs in top markets by 24h volume.
 * Early liquidity providers earn rewards; top 100 markets by volume distribute LP rewards daily.
 */

import { prisma } from "./db";
import { roundMoney } from "./position-pnl";

const WINDOW_24H_MS = 24 * 60 * 60 * 1000;
const TOP_MARKETS_LIMIT = 100;
const DAILY_REWARD_POOL_PER_MARKET = 10; // tokens per top market to distribute

/**
 * 1. Fetch top markets by 24h volume.
 * 2. Distribute reward pool proportionally to LP share (by lpTokens in that market).
 */
export async function distributeLiquidityRewards(): Promise<{ distributed: number; markets: number }> {
  const since = new Date(Date.now() - WINDOW_24H_MS);

  const volumeByMarket = await prisma.trade.groupBy({
    by: ["marketId"],
    where: { createdAt: { gte: since } },
    _sum: { total: true },
  });

  const sorted = volumeByMarket
    .map((r) => ({ marketId: r.marketId, volume24h: r._sum.total ?? 0 }))
    .filter((r) => r.volume24h > 0)
    .sort((a, b) => b.volume24h - a.volume24h)
    .slice(0, TOP_MARKETS_LIMIT);

  if (sorted.length === 0) return { distributed: 0, markets: 0 };

  let totalDistributed = 0;
  for (const { marketId } of sorted) {
    const pool = await prisma.liquidityPool.findUnique({
      where: { marketId },
      select: { totalLpShares: true },
    });
    const positions = await prisma.liquidityPosition.findMany({
      where: { marketId, lpTokens: { gt: 0 } },
      select: { id: true, userId: true, lpTokens: true },
    });
    if (!pool || pool.totalLpShares <= 0 || positions.length === 0) continue;

    const rewardForMarket = DAILY_REWARD_POOL_PER_MARKET;
    const totalLp = pool.totalLpShares;

    for (const pos of positions) {
      const share = pos.lpTokens / totalLp;
      const reward = roundMoney(rewardForMarket * share);
      if (reward <= 0) continue;
      await prisma.$transaction([
        prisma.liquidityReward.create({
          data: {
            userId: pos.userId,
            marketId,
            reward,
            reason: "daily_top_volume_lp",
          },
        }),
        prisma.user.update({
          where: { id: pos.userId },
          data: { balance: { increment: reward } },
        }),
      ]);
      totalDistributed += reward;
    }
  }

  return { distributed: totalDistributed, markets: sorted.length };
}
