/**
 * Bot probability scoring: account age, trading patterns, referral clusters.
 * Updates User.botProbability and can set flaggedAt.
 */

import { prisma } from "./db";

const MIN_ACCOUNT_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SUSPICIOUS_TRADE_RATE = 50; // trades per hour
const FLAG_THRESHOLD = 0.7;

export async function computeBotProbability(userId: string): Promise<number> {
  const [user, tradesLastHour, referredCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true, referredById: true },
    }),
    prisma.trade.count({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    }),
    prisma.user.count({ where: { referredById: userId } }),
  ]);
  if (!user) return 0;

  let score = 0;
  const ageMs = Date.now() - user.createdAt.getTime();
  if (ageMs < MIN_ACCOUNT_AGE_MS) score += 0.3;
  if (tradesLastHour >= SUSPICIOUS_TRADE_RATE) score += 0.4;
  if (referredCount >= 10 && ageMs < MIN_ACCOUNT_AGE_MS * 2) score += 0.2;
  const probability = Math.min(1, Math.round(score * 100) / 100);

  await prisma.user.update({
    where: { id: userId },
    data: {
      botProbability: probability,
      ...(probability >= FLAG_THRESHOLD ? { flaggedAt: new Date() } : {}),
    },
  });
  return probability;
}

export async function runBotDetectionForRecentTraders(): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const userIds = await prisma.trade.findMany({
    where: { createdAt: { gte: since } },
    select: { userId: true },
    distinct: ["userId"],
  }).then((r) => Array.from(new Set(r.map((x) => x.userId))));
  let updated = 0;
  for (const id of userIds.slice(0, 100)) {
    await computeBotProbability(id);
    updated++;
  }
  return updated;
}
