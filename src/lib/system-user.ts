/**
 * System user for market activity simulation (and other bot operations).
 * Trades made by this user are tagged isSystemTrade and excluded from leaderboards.
 */

import { prisma } from "./db";
import { ensureUserBalance } from "./platform-balance";

export const SYSTEM_USER_EMAIL = "system@chaotix.internal";
export const SYSTEM_USER_REFERRAL_CODE = "SYS0";
/** Minimum balance to keep on system user for simulation buys. */
const SYSTEM_USER_MIN_BALANCE = 500_000;

let cachedSystemUserId: string | null = null;

/**
 * Get or create the system user. Ensures they have at least SYSTEM_USER_MIN_BALANCE.
 * Use this before running system trades.
 */
export async function getOrCreateSystemUser(): Promise<{ id: string }> {
  if (cachedSystemUserId) {
    await ensureSystemUserBalance(cachedSystemUserId);
    return { id: cachedSystemUserId };
  }
  let user = await prisma.user.findUnique({
    where: { email: SYSTEM_USER_EMAIL },
    select: { id: true },
  });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: SYSTEM_USER_EMAIL,
        name: "Chaotix System",
        referralCode: SYSTEM_USER_REFERRAL_CODE,
        waitlistStatus: "active",
        balance: SYSTEM_USER_MIN_BALANCE,
      },
      select: { id: true },
    });
  }
  cachedSystemUserId = user.id;
  await ensureSystemUserBalance(user.id);
  return { id: user.id };
}

/**
 * Ensure system user's balance is at least SYSTEM_USER_MIN_BALANCE (topped up if needed).
 */
async function ensureSystemUserBalance(userId: string): Promise<void> {
  const { balance } = await ensureUserBalance(userId);
  if (balance >= SYSTEM_USER_MIN_BALANCE) return;
  const toAdd = SYSTEM_USER_MIN_BALANCE - balance;
  await prisma.userBalance.upsert({
    where: { userId },
    create: { userId, balance: SYSTEM_USER_MIN_BALANCE, lockedBalance: 0 },
    update: { balance: { increment: toAdd } },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { balance: SYSTEM_USER_MIN_BALANCE },
  }).catch(() => {});
}

/**
 * Return system user id if it exists (for leaderboard exclusion). Does not create.
 */
export async function getSystemUserId(): Promise<string | null> {
  if (cachedSystemUserId) return cachedSystemUserId;
  const user = await prisma.user.findUnique({
    where: { email: SYSTEM_USER_EMAIL },
    select: { id: true },
  });
  if (user) cachedSystemUserId = user.id;
  return user?.id ?? null;
}
