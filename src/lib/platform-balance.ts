/**
 * Platform wallet: UserBalance table (balance + lockedBalance).
 * Keeps User.balance in sync for backward compatibility with /api/auth/me etc.
 */

import { prisma } from "./db";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

export async function ensureUserBalance(
  userId: string,
  tx?: TxClient
): Promise<{ balance: number; lockedBalance: number }> {
  const client = tx ?? prisma;
  let ub = await (client as typeof prisma).userBalance.findUnique({
    where: { userId },
    select: { balance: true, lockedBalance: true },
  });
  if (!ub) {
    const user = await (client as typeof prisma).user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });
    const initial = user?.balance ?? 0;
    ub = await (client as typeof prisma).userBalance.create({
      data: { userId, balance: initial, lockedBalance: 0 },
      select: { balance: true, lockedBalance: true },
    });
  }
  return { balance: ub.balance, lockedBalance: ub.lockedBalance };
}

/** Available = balance - lockedBalance */
export async function getAvailableBalance(userId: string): Promise<number> {
  const { balance, lockedBalance } = await ensureUserBalance(userId);
  return Math.max(0, balance - lockedBalance);
}

/** Total balance (including locked). Also syncs User.balance for backward compat. */
export async function getBalance(userId: string): Promise<number> {
  const { balance } = await ensureUserBalance(userId);
  await prisma.user.update({
    where: { id: userId },
    data: { balance },
  }).catch(() => {});
  return balance;
}

/** Debit available balance (fails if available < amount). */
export async function debitBalance(
  userId: string,
  amount: number,
  tx?: TxClient
): Promise<{ ok: boolean; newBalance?: number }> {
  if (amount <= 0) return { ok: false };
  const client = tx ?? prisma;
  await ensureUserBalance(userId, client as TxClient);
  const row = await (client as typeof prisma).userBalance.findUnique({
    where: { userId },
    select: { balance: true, lockedBalance: true },
  });
  if (!row) return { ok: false };
  const available = row.balance - row.lockedBalance;
  if (available < amount) return { ok: false };
  await (client as typeof prisma).userBalance.update({
    where: { userId },
    data: { balance: { decrement: amount } },
  });
  const updated = await (client as typeof prisma).userBalance.findUnique({
    where: { userId },
    select: { balance: true },
  });
  const newBalance = updated?.balance ?? 0;
  await (client as typeof prisma).user.update({
    where: { id: userId },
    data: { balance: newBalance },
  }).catch(() => {});
  return { ok: true, newBalance };
}

/** Credit balance. */
export async function creditBalance(
  userId: string,
  amount: number,
  tx?: TxClient
): Promise<void> {
  if (amount <= 0) return;
  const client = tx ?? prisma;
  await ensureUserBalance(userId, client as TxClient);
  await (client as typeof prisma).userBalance.update({
    where: { userId },
    data: { balance: { increment: amount } },
  });
  const ub = await (client as typeof prisma).userBalance.findUnique({
    where: { userId },
    select: { balance: true },
  });
  if (ub) {
    await (client as typeof prisma).user.update({
      where: { id: userId },
      data: { balance: ub.balance },
    }).catch(() => {});
  }
}

/** Debit and lock (for buy): balance -= amount, lockedBalance += amount. */
export async function debitAndLock(
  userId: string,
  amount: number,
  tx?: TxClient
): Promise<{ ok: boolean }> {
  if (amount <= 0) return { ok: false };
  const client = tx ?? prisma;
  await ensureUserBalance(userId, client as TxClient);
  const row = await (client as typeof prisma).userBalance.findUnique({
    where: { userId },
    select: { balance: true, lockedBalance: true },
  });
  if (!row || row.balance - row.lockedBalance < amount) return { ok: false };
  await (client as typeof prisma).userBalance.update({
    where: { userId },
    data: {
      balance: { decrement: amount },
      lockedBalance: { increment: amount },
    },
  });
  const ub = await (client as typeof prisma).userBalance.findUnique({
    where: { userId },
    select: { balance: true },
  });
  if (ub) {
    await (client as typeof prisma).user.update({
      where: { id: userId },
      data: { balance: ub.balance },
    }).catch(() => {});
  }
  return { ok: true };
}

/** Release lock and credit (for sell): lockedBalance -= releaseAmount, balance += creditAmount. */
export async function releaseLockAndCredit(
  userId: string,
  releaseLockAmount: number,
  creditAmount: number,
  tx?: TxClient
): Promise<void> {
  const client = tx ?? prisma;
  await ensureUserBalance(userId, client as TxClient);
  await (client as typeof prisma).userBalance.update({
    where: { userId },
    data: {
      lockedBalance: { decrement: releaseLockAmount },
      balance: { increment: creditAmount },
    },
  });
  const ub = await (client as typeof prisma).userBalance.findUnique({
    where: { userId },
    select: { balance: true },
  });
  if (ub) {
    await (client as typeof prisma).user.update({
      where: { id: userId },
      data: { balance: ub.balance },
    }).catch(() => {});
  }
}
