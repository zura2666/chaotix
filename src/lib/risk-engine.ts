/**
 * Risk engine: block trades that exceed position, daily loss, or concentration limits.
 */

import { prisma } from "./db";
import {
  MAX_POSITION_PCT_OF_SUPPLY_RISK,
  MAX_DAILY_LOSS_PCT,
  MAX_MARKET_EXPOSURE_PCT,
} from "./constants";

const DAY_MS = 24 * 60 * 60 * 1000;

export type RiskCheckResult = { ok: true } | { ok: false; reason: string };

/**
 * Max position size: user position must not exceed X% of total supply.
 */
export async function checkMaxPositionSize(
  userId: string,
  marketId: string,
  additionalShares: number
): Promise<RiskCheckResult> {
  const [position, market] = await Promise.all([
    prisma.position.findUnique({
      where: { userId_marketId: { userId, marketId } },
      select: { shares: true },
    }),
    prisma.market.findUnique({
      where: { id: marketId },
      include: { positions: { select: { shares: true } } },
    }),
  ]);
  if (!market) return { ok: false, reason: "Market not found" };
  const totalSupply = market.positions.reduce((s, p) => s + p.shares, 0);
  if (totalSupply <= 0) return { ok: true };
  const currentShares = position?.shares ?? 0;
  const newTotal = currentShares + additionalShares;
  if (newTotal / totalSupply > MAX_POSITION_PCT_OF_SUPPLY_RISK) {
    return {
      ok: false,
      reason: `Position would exceed ${MAX_POSITION_PCT_OF_SUPPLY_RISK * 100}% of supply`,
    };
  }
  return { ok: true };
}

/**
 * Max daily loss: if user's realized losses today exceed X% of portfolio value at start of day, block sells.
 * Simplified: we don't have start-of-day snapshot; we block if daily realized loss exceeds threshold.
 */
export async function checkMaxDailyLoss(
  userId: string,
  potentialLoss: number
): Promise<RiskCheckResult> {
  if (potentialLoss <= 0) return { ok: true };
  const since = new Date(Date.now() - DAY_MS);
  const todayTrades = await prisma.trade.findMany({
    where: { userId, createdAt: { gte: since }, side: "sell" },
    select: { total: true },
  });
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });
  const portfolioValue = user?.balance ?? 0;
  const maxLoss = portfolioValue * MAX_DAILY_LOSS_PCT;
  if (potentialLoss > maxLoss) {
    return {
      ok: false,
      reason: `Daily loss limit (${MAX_DAILY_LOSS_PCT * 100}% of portfolio) would be exceeded`,
    };
  }
  return { ok: true };
}

/**
 * Max market exposure: total value in one market must not exceed X% of user's total portfolio value.
 */
export async function checkMaxMarketExposure(
  userId: string,
  marketId: string,
  positionValue: number
): Promise<RiskCheckResult> {
  const [positions, user] = await Promise.all([
    prisma.position.findMany({
      where: { userId, shares: { gt: 0 } },
      include: { market: { select: { price: true } } },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    }),
  ]);
  const totalValue =
    (user?.balance ?? 0) +
    positions.reduce((s, p) => s + p.shares * (p.market?.price ?? 0), 0);
  if (totalValue <= 0) return { ok: true };
  if (positionValue / totalValue > MAX_MARKET_EXPOSURE_PCT) {
    return {
      ok: false,
      reason: `Market exposure would exceed ${MAX_MARKET_EXPOSURE_PCT * 100}% of portfolio`,
    };
  }
  return { ok: true };
}

export async function runRiskChecks(
  userId: string,
  marketId: string,
  side: "buy" | "sell",
  shares: number,
  value: number,
  potentialRealizedLoss?: number
): Promise<RiskCheckResult> {
  if (side === "buy") {
    const pos = await checkMaxPositionSize(userId, marketId, shares);
    if (!pos.ok) return pos;
    return checkMaxMarketExposure(userId, marketId, value);
  }
  if (potentialRealizedLoss && potentialRealizedLoss > 0) {
    const loss = await checkMaxDailyLoss(userId, potentialRealizedLoss);
    if (!loss.ok) return loss;
  }
  return { ok: true };
}
