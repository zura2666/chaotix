/**
 * Suspicious activity scoring: wash trading, self-volume, rapid tiny trades.
 */

import { prisma } from "./db";

const RAPID_TRADE_WINDOW_MS = 60 * 1000; // 1 min
const RAPID_TRADE_THRESHOLD = 8;
const TINY_TRADE_SIZE = 2;
const TINY_REPEAT_THRESHOLD = 5;
const SAME_PAIR_LOOP_WINDOW_MS = 5 * 60 * 1000; // 5 min

export type SuspiciousSignals = {
  rapidRepeatedTrades: boolean;
  tinyRepeatedTrades: boolean;
  possibleWashLoop: boolean;
  abnormalSpike: boolean;
  score: number;
};

export async function computeUserSuspiciousScore(userId: string): Promise<SuspiciousSignals> {
  const since = new Date(Date.now() - 30 * 60 * 1000); // 30 min
  const trades = await prisma.trade.findMany({
    where: { userId: userId, createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
  });

  let rapidCount = 0;
  let tinyCount = 0;
  let possibleWash = false;
  const marketPairs: { marketId: string; side: string }[] = [];

  for (let i = 0; i < trades.length; i++) {
    const t = trades[i];
    const prev = trades[i - 1];
    if (prev && t.createdAt.getTime() - prev.createdAt.getTime() < RAPID_TRADE_WINDOW_MS) {
      rapidCount++;
    }
    if (t.total <= TINY_TRADE_SIZE) tinyCount++;
    marketPairs.push({ marketId: t.marketId, side: t.side });
  }

  for (let i = 0; i < marketPairs.length - 1; i++) {
    const a = marketPairs[i];
    for (let j = i + 1; j < Math.min(i + 10, marketPairs.length); j++) {
      const b = marketPairs[j];
      if (
        a.marketId === b.marketId &&
        a.side !== b.side &&
        trades[j].createdAt.getTime() - trades[i].createdAt.getTime() < SAME_PAIR_LOOP_WINDOW_MS
      ) {
        possibleWash = true;
        break;
      }
    }
  }

  const rapidRepeatedTrades = rapidCount >= RAPID_TRADE_THRESHOLD;
  const tinyRepeatedTrades = tinyCount >= TINY_REPEAT_THRESHOLD;

  let score = 0;
  if (rapidRepeatedTrades) score += 40;
  if (tinyRepeatedTrades) score += 30;
  if (possibleWash) score += 50;

  return {
    rapidRepeatedTrades,
    tinyRepeatedTrades,
    possibleWashLoop: possibleWash,
    abnormalSpike: false,
    score: Math.min(100, score),
  };
}

export async function computeMarketSuspiciousScore(marketId: string): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const trades = await prisma.trade.findMany({
    where: { marketId, createdAt: { gte: since } },
    select: { userId: true, total: true, side: true, createdAt: true },
  });
  const byUser = new Map<string, { buy: number; sell: number; count: number }>();
  for (const t of trades) {
    const u = byUser.get(t.userId) ?? { buy: 0, sell: 0, count: 0 };
    if (t.side === "buy") u.buy += t.total;
    else u.sell += t.total;
    u.count++;
    byUser.set(t.userId, u);
  }
  let score = 0;
  Array.from(byUser.values()).forEach((u) => {
    if (u.count >= 10 && Math.abs(u.buy - u.sell) < u.buy * 0.2) score += 25;
  });
  return Math.min(100, score);
}

export async function recordAlert(
  type: string,
  message: string,
  opts: { resource?: string; resourceId?: string; severity?: string; payload?: unknown }
) {
  await prisma.adminAlert.create({
    data: {
      type,
      message,
      resource: opts.resource,
      resourceId: opts.resourceId,
      severity: opts.severity ?? "medium",
      payload: opts.payload ? JSON.stringify(opts.payload) : null,
    },
  });
}
