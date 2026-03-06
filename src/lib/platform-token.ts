/**
 * Platform token economics: fee distribution, treasury, LP incentives, referral payouts.
 * Records only; no actual token mint/transfer yet.
 */

import { prisma } from "./db";

export type PlatformTokenKind =
  | "fee_collected"
  | "lp_incentive"
  | "referral_payout"
  | "treasury";

export async function recordFeeCollected(
  amount: number,
  referenceId: string,
  payload?: Record<string, unknown>
): Promise<void> {
  if (amount <= 0) return;
  await prisma.platformToken.create({
    data: {
      kind: "fee_collected",
      amount,
      referenceId,
      payload: payload ? JSON.stringify(payload) : null,
    },
  });
}

export async function recordLpIncentive(
  amount: number,
  referenceId: string,
  payload?: Record<string, unknown>
): Promise<void> {
  if (amount <= 0) return;
  await prisma.platformToken.create({
    data: {
      kind: "lp_incentive",
      amount,
      referenceId,
      payload: payload ? JSON.stringify(payload) : null,
    },
  });
}

export async function recordReferralPayout(
  amount: number,
  referenceId: string,
  payload?: Record<string, unknown>
): Promise<void> {
  if (amount <= 0) return;
  await prisma.platformToken.create({
    data: {
      kind: "referral_payout",
      amount,
      referenceId,
      payload: payload ? JSON.stringify(payload) : null,
    },
  });
}

export async function recordTreasury(
  amount: number,
  referenceId?: string,
  payload?: Record<string, unknown>
): Promise<void> {
  if (amount <= 0) return;
  await prisma.platformToken.create({
    data: {
      kind: "treasury",
      amount,
      referenceId: referenceId ?? null,
      payload: payload ? JSON.stringify(payload) : null,
    },
  });
}

export async function getTreasuryStats(dayStart?: Date): Promise<{
  dailyFees: number;
  dailyLpRewards: number;
  dailyReferralPayouts: number;
  dailyPlatformProfit: number;
  totalFees: number;
  totalLpRewards: number;
  totalReferralPayouts: number;
  totalTreasury: number;
}> {
  const start = dayStart ?? new Date(new Date().setHours(0, 0, 0, 0));
  const [
    dailyFees,
    dailyLp,
    dailyRef,
    dailyTreasury,
    totalFees,
    totalLp,
    totalRef,
    totalTreasury,
  ] = await Promise.all([
    prisma.platformToken
      .aggregate({
        where: { kind: "fee_collected", createdAt: { gte: start } },
        _sum: { amount: true },
      })
      .then((r) => r._sum.amount ?? 0),
    prisma.platformToken
      .aggregate({
        where: { kind: "lp_incentive", createdAt: { gte: start } },
        _sum: { amount: true },
      })
      .then((r) => r._sum.amount ?? 0),
    prisma.platformToken
      .aggregate({
        where: { kind: "referral_payout", createdAt: { gte: start } },
        _sum: { amount: true },
      })
      .then((r) => r._sum.amount ?? 0),
    prisma.platformToken
      .aggregate({
        where: { kind: "treasury", createdAt: { gte: start } },
        _sum: { amount: true },
      })
      .then((r) => r._sum.amount ?? 0),
    prisma.platformToken
      .aggregate({ where: { kind: "fee_collected" }, _sum: { amount: true } })
      .then((r) => r._sum.amount ?? 0),
    prisma.platformToken
      .aggregate({ where: { kind: "lp_incentive" }, _sum: { amount: true } })
      .then((r) => r._sum.amount ?? 0),
    prisma.platformToken
      .aggregate({ where: { kind: "referral_payout" }, _sum: { amount: true } })
      .then((r) => r._sum.amount ?? 0),
    prisma.platformToken
      .aggregate({ where: { kind: "treasury" }, _sum: { amount: true } })
      .then((r) => r._sum.amount ?? 0),
  ]);
  const dailyPlatformProfit = dailyFees - dailyLp - dailyRef;
  return {
    dailyFees,
    dailyLpRewards: dailyLp,
    dailyReferralPayouts: dailyRef,
    dailyPlatformProfit,
    totalFees,
    totalLpRewards: totalLp,
    totalReferralPayouts: totalRef,
    totalTreasury,
  };
}
