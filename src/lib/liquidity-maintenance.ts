/**
 * Liquidity maintenance: rebalance thin pools, inject minimal liquidity for trending markets.
 * Called by cron liquidity-maintenance.
 */

import { prisma } from "./db";
import { computeLiquidityHealth } from "./liquidity-health";
import { recordLiquiditySeed } from "./platform-token";
import { getTrendingMarkets } from "./trending";

const INJECT_TOKENS_PER_MARKET = 500;
const INJECT_MAX_TOTAL_PER_RUN = 5_000;
const MAX_MARKETS_TO_PROCESS = 20;
const MIN_DEPTH_THIN = 500;
const MIN_DEPTH_CRITICAL = 100;

/**
 * Inject liquidity into a market without changing price: add tokens and proportional shares.
 */
async function injectLiquidity(
  marketId: string,
  reserveTokens: number,
  reserveShares: number,
  tokenAmount: number
): Promise<boolean> {
  if (tokenAmount <= 0 || reserveTokens <= 0 || reserveShares <= 0) return false;
  const shareAmount = (reserveShares / reserveTokens) * tokenAmount;
  await prisma.market.update({
    where: { id: marketId },
    data: {
      reserveTokens: { increment: tokenAmount },
      reserveShares: { increment: shareAmount },
    },
  });
  await recordLiquiditySeed(marketId, tokenAmount, shareAmount);
  return true;
}

export type LiquidityMaintenanceResult = {
  rebalanced: number;
  injected: number;
  totalTokensInjected: number;
  errors: string[];
};

/**
 * Run liquidity maintenance: find thin/critical pools and trending markets with low liquidity, inject from treasury.
 */
export async function runLiquidityMaintenance(): Promise<LiquidityMaintenanceResult> {
  const result: LiquidityMaintenanceResult = {
    rebalanced: 0,
    injected: 0,
    totalTokensInjected: 0,
    errors: [],
  };

  try {
    const [thinMarkets, trending] = await Promise.all([
      prisma.market.findMany({
        where: {
          status: "active",
          reserveTokens: { gt: 0 },
          reserveShares: { gt: 0 },
        },
        select: {
          id: true,
          reserveTokens: true,
          reserveShares: true,
          price: true,
          volume: true,
          tradeCount: true,
          positions: { select: { shares: true, userId: true } },
        },
        take: 200,
      }),
      getTrendingMarkets(MAX_MARKETS_TO_PROCESS),
    ]);

    const trendingIds = new Set(trending.map((m) => m.id));
    const candidates: { id: string; reserveTokens: number; reserveShares: number; isTrending: boolean }[] = [];

    for (const m of thinMarkets) {
      const health = computeLiquidityHealth({
        reserveTokens: m.reserveTokens,
        reserveShares: m.reserveShares,
        price: m.price,
        volume: m.volume,
        tradeCount: m.tradeCount,
        positions: m.positions,
      });
      if (health.status === "thin" || health.status === "critical") {
        candidates.push({
          id: m.id,
          reserveTokens: m.reserveTokens,
          reserveShares: m.reserveShares,
          isTrending: trendingIds.has(m.id),
        });
      }
    }

    // Prefer trending + critical, then critical, then thin
    candidates.sort((a, b) => {
      const aTrending = trendingIds.has(a.id) ? 1 : 0;
      const bTrending = trendingIds.has(b.id) ? 1 : 0;
      if (bTrending !== aTrending) return bTrending - aTrending;
      return 0;
    });

    let totalInjected = 0;
    for (const c of candidates.slice(0, MAX_MARKETS_TO_PROCESS)) {
      if (totalInjected >= INJECT_MAX_TOTAL_PER_RUN) break;
      const toInject = Math.min(INJECT_TOKENS_PER_MARKET, INJECT_MAX_TOTAL_PER_RUN - totalInjected);
      try {
        const ok = await injectLiquidity(c.id, c.reserveTokens, c.reserveShares, toInject);
        if (ok) {
          result.rebalanced++;
          result.injected++;
          result.totalTokensInjected += toInject;
          totalInjected += toInject;
        }
      } catch (e) {
        result.errors.push(`${c.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return result;
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : String(e));
    return result;
  }
}
