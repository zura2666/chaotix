/**
 * User balance abstraction. Uses UserBalance table (balance + lockedBalance)
 * and keeps User.balance in sync for backward compatibility.
 */

import {
  getBalance as getPlatformBalance,
  getAvailableBalance,
  debitBalance as debitPlatformBalance,
  creditBalance as creditPlatformBalance,
  debitAndLock,
  releaseLockAndCredit,
} from "./platform-balance";

export type BalanceSource = "mock" | "wallet";

export { getAvailableBalance, debitAndLock, releaseLockAndCredit };

export async function getBalance(userId: string): Promise<number> {
  return getPlatformBalance(userId);
}

export async function debitBalance(
  userId: string,
  amount: number,
  tx?: { user: { update: (args: unknown) => Promise<unknown> } }
): Promise<{ ok: boolean; newBalance?: number }> {
  return debitPlatformBalance(userId, amount, tx as Parameters<typeof debitPlatformBalance>[2]);
}

export async function creditBalance(
  userId: string,
  amount: number,
  tx?: { user: { update: (args: unknown) => Promise<unknown> } }
): Promise<void> {
  return creditPlatformBalance(userId, amount, tx as Parameters<typeof creditPlatformBalance>[2]);
}

export function getBalanceSource(): BalanceSource {
  return "mock";
}
