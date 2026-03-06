/**
 * Anti-manipulation: detect wash trading, large liquidity drain, price spike.
 * Log to SuspiciousActivity; optionally freeze market for 5 minutes.
 */

import { prisma } from "./db";
import {
  SUSPICIOUS_DRAIN_PCT,
  SUSPICIOUS_PRICE_SPIKE_PCT,
  SUSPICIOUS_FREEZE_MINUTES,
} from "./constants";

const WASH_WINDOW_MS = 5 * 60 * 1000;
const PRICE_SPIKE_WINDOW_MS = 5 * 60 * 1000;

export async function recordSuspicious(
  marketId: string,
  type: string,
  details: Record<string, unknown>,
  userId?: string
): Promise<void> {
  await prisma.suspiciousActivity.create({
    data: {
      marketId,
      userId: userId ?? null,
      type,
      details: JSON.stringify(details),
    },
  });
}

/** Detect wash trading: same user buy/sell loops in short window. */
export async function checkWashTrading(
  marketId: string,
  userId: string,
  side: string,
  total: number
): Promise<boolean> {
  const since = new Date(Date.now() - WASH_WINDOW_MS);
  const recent = await prisma.trade.findMany({
    where: { marketId, userId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { side: true, total: true },
  });
  const opposite = side === "buy" ? "sell" : "buy";
  const sameSideCount = recent.filter((t) => t.side === side).length;
  const oppositeCount = recent.filter((t) => t.side === opposite).length;
  if (recent.length >= 5 && sameSideCount >= 2 && oppositeCount >= 2) {
    await recordSuspicious(marketId, "wash_trading", {
      userId,
      side,
      total,
      recentTrades: recent.length,
      sameSideCount,
      oppositeCount,
    }, userId);
    return true;
  }
  return false;
}

/** Detect large liquidity drain: single sell >40% of pool. */
export async function checkLargeDrain(
  marketId: string,
  userId: string,
  tokensOut: number,
  reserveTokensBefore: number
): Promise<boolean> {
  if (reserveTokensBefore <= 0) return false;
  const pct = (tokensOut / reserveTokensBefore) * 100;
  if (pct >= SUSPICIOUS_DRAIN_PCT) {
    await recordSuspicious(marketId, "large_liquidity_drain", {
      userId,
      tokensOut,
      reserveTokensBefore,
      pct,
    }, userId);
    return true;
  }
  return false;
}

/** Detect price spike: >300% change in 5 minutes. */
export async function checkPriceSpike(marketId: string, currentPrice: number): Promise<boolean> {
  const since = new Date(Date.now() - PRICE_SPIKE_WINDOW_MS);
  const oldPoints = await prisma.pricePoint.findFirst({
    where: { marketId, timestamp: { lte: since } },
    orderBy: { timestamp: "desc" },
    select: { price: true },
  });
  if (!oldPoints || oldPoints.price <= 0) return false;
  const pctChange = Math.abs((currentPrice - oldPoints.price) / oldPoints.price) * 100;
  if (pctChange >= SUSPICIOUS_PRICE_SPIKE_PCT) {
    await recordSuspicious(marketId, "price_spike", {
      currentPrice,
      oldPrice: oldPoints.price,
      pctChange,
    });
    return true;
  }
  return false;
}

/** Optionally freeze market for 5 minutes (set circuit breaker). */
export async function freezeMarketIfSuspicious(marketId: string): Promise<void> {
  const freezeMs = SUSPICIOUS_FREEZE_MINUTES * 60 * 1000;
  await prisma.market.update({
    where: { id: marketId },
    data: { circuitBreakerUntil: new Date(Date.now() + freezeMs) },
  });
}
