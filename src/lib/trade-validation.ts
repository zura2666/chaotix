import {
  MIN_TRADE_AMOUNT,
  MIN_TRADE_SHARES,
  MAX_TRADE_AMOUNT,
} from "./constants";

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateBuyAmount(amount: number): ValidationResult {
  if (typeof amount !== "number" || !Number.isFinite(amount)) {
    return { ok: false, error: "Invalid amount" };
  }
  if (amount < MIN_TRADE_AMOUNT) {
    return { ok: false, error: `Minimum trade is ${MIN_TRADE_AMOUNT}` };
  }
  if (amount > MAX_TRADE_AMOUNT) {
    return { ok: false, error: `Maximum trade is ${MAX_TRADE_AMOUNT}` };
  }
  return { ok: true };
}

export function validateSellShares(shares: number): ValidationResult {
  if (typeof shares !== "number" || !Number.isFinite(shares)) {
    return { ok: false, error: "Invalid shares" };
  }
  if (shares < MIN_TRADE_SHARES) {
    return { ok: false, error: `Minimum shares to sell is ${MIN_TRADE_SHARES}` };
  }
  return { ok: true };
}

export function validateReferrer(
  referrerId: string | null | undefined,
  userId: string
): boolean {
  if (!referrerId) return true;
  return referrerId !== userId;
}
