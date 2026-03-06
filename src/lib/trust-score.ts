/**
 * Trust score: account age, trades, PnL stability, reputation, bot probability, referral quality.
 * Influences market creation limits, trending weight, trade influence.
 */

import { prisma } from "./db";

const MAX_TRUST = 100;

export async function computeUserTrustScore(userId: string): Promise<number> {
  const [user, trades, positions, referred] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        createdAt: true,
        reputationScore: true,
        botProbability: true,
        trustLevel: true,
      },
    }),
    prisma.trade.aggregate({
      where: { userId },
      _count: true,
      _sum: { total: true },
    }),
    prisma.position.findMany({
      where: { userId },
      select: { realizedPnL: true, totalBought: true },
    }),
    prisma.user.findMany({
      where: { referredById: userId },
      select: { id: true },
    }),
  ]);
  if (!user) return 0;

  let score = 0;
  const ageDays = (Date.now() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000);
  score += Math.min(25, ageDays * 0.5);
  score += Math.min(20, (trades._count ?? 0) * 0.2);
  const totalCost = positions.reduce((s, p) => s + p.totalBought, 0);
  const totalPnL = positions.reduce((s, p) => s + p.realizedPnL, 0);
  if (totalCost >= 100) {
    const roi = totalPnL / totalCost;
    score += Math.min(15, Math.max(-10, roi * 50));
  }
  score += Math.min(20, Math.max(0, user.reputationScore / 5));
  score -= (user.botProbability ?? 0) * 30;
  score += Math.min(10, referred.length);
  score += user.trustLevel * 2;

  const final = Math.max(0, Math.min(MAX_TRUST, Math.round(score * 10) / 10));
  await prisma.user.update({
    where: { id: userId },
    data: { trustScore: final },
  });
  return final;
}

export function getTrustWeight(trustScore: number): number {
  if (trustScore >= 80) return 1.2;
  if (trustScore >= 50) return 1;
  if (trustScore >= 25) return 0.8;
  return 0.6;
}
