/**
 * Referral abuse detection: burst signups, referral rings, self-referral patterns.
 * Call from: referral payout, referral application approval, or periodic job.
 */

import { prisma } from "./db";

const BURST_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const BURST_THRESHOLD = 15; // same referrer, 15+ new users in 1 hour = suspicious
const RING_MIN_DEPTH = 2; // A->B->C or A->B->A

export type ReferralAbuseResult = {
  ok: boolean;
  reason?: string;
  type?: "burst" | "ring" | "self_referral";
};

/** Check if referrer has a burst of new referrals in a short window (farm detection). */
export async function checkReferralBurst(referrerId: string): Promise<ReferralAbuseResult> {
  const since = new Date(Date.now() - BURST_WINDOW_MS);
  const count = await prisma.user.count({
    where: { referredById: referrerId, createdAt: { gte: since } },
  });
  if (count >= BURST_THRESHOLD) {
    return { ok: false, reason: "Referral burst detected", type: "burst" };
  }
  return { ok: true };
}

/** Check for referral ring: referrer chain that loops back (A refers B, B refers A or C refers A). */
export async function checkReferralRing(userId: string, referrerId: string): Promise<ReferralAbuseResult> {
  if (userId === referrerId) return { ok: false, reason: "Self-referral not allowed", type: "self_referral" };
  const visited = new Set<string>();
  let currentId: string | null = referrerId;
  let depth = 0;
  while (currentId && depth <= RING_MIN_DEPTH + 2) {
    if (visited.has(currentId)) {
      return { ok: false, reason: "Referral ring detected", type: "ring" };
    }
    if (currentId === userId) {
      return { ok: false, reason: "Referral ring detected", type: "ring" };
    }
    visited.add(currentId);
    const u = await prisma.user.findUnique({
      where: { id: currentId },
      select: { referredById: true },
    });
    currentId = u?.referredById ?? null;
    depth++;
  }
  return { ok: true };
}

/** Run both checks before approving a referral or paying out. */
export async function validateReferralNotAbuse(
  referredUserId: string,
  referrerId: string
): Promise<ReferralAbuseResult> {
  const selfCheck = await checkReferralRing(referredUserId, referrerId);
  if (!selfCheck.ok) return selfCheck;
  const burstCheck = await checkReferralBurst(referrerId);
  if (!burstCheck.ok) return burstCheck;
  return { ok: true };
}
