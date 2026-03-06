/**
 * Phase 11: Centralized Zod schemas for API request validation.
 * Use parseOrThrow in route handlers and return 400 with .message on failure.
 */

import { z } from "zod";
import { validateIdentifierSafe } from "./identifiers";

// --- Shared refinements ---
const positiveNumber = z.number().finite().positive();
const nonNegativeNumber = z.number().finite().min(0);

/** 3–32 chars, a-z 0-9 _ - (validated via identifier helper) */
export const canonicalSchema = z.string().min(1, "Market name required").max(500).transform((s) => {
  const r = validateIdentifierSafe(s.trim());
  if (!r.ok) throw new z.ZodError([{ code: "custom", path: [], message: r.error }]);
  return r.value;
});

/** Display name: allow spaces, trim, no leading/trailing spaces, max length */
export const displayNameSchema = z
  .string()
  .max(100, "Display name max 100 characters")
  .transform((s) => s.trim().replace(/\s+/g, " "))
  .optional()
  .nullable();

/** Username: same as identifier (3–32, a-z 0-9 _ -). Optional for register. */
export const usernameSchema = z
  .string()
  .max(64)
  .transform((s) => s.trim() || undefined)
  .optional()
  .nullable()
  .transform((s) => {
    if (s == null || s === "") return s;
    const r = validateIdentifierSafe(s);
    if (!r.ok) throw new z.ZodError([{ code: "custom", path: [], message: r.error }]);
    return r.value;
  });

// --- Trade ---
export const tradeBodySchema = z.object({
  action: z.enum(["buy", "sell"]),
  marketId: z.string().min(1, "marketId required"),
  amount: positiveNumber.optional(), // for buy
  shares: positiveNumber.optional(), // for sell
});
export type TradeBody = z.infer<typeof tradeBodySchema>;

// --- Liquidity add ---
export const liquidityAddBodySchema = z.object({
  amount: z.number().finite().min(1, "Amount must be at least 1"),
});
export type LiquidityAddBody = z.infer<typeof liquidityAddBodySchema>;

// --- Liquidity remove ---
export const liquidityRemoveBodySchema = z.object({
  lpTokens: z.number().finite().positive("Valid lpTokens required"),
});
export type LiquidityRemoveBody = z.infer<typeof liquidityRemoveBodySchema>;

// --- Market creation ---
export const marketCreateBodySchema = z.object({
  string: z.string().min(1, "Market string required").max(500).optional(),
  q: z.string().min(1).max(500).optional(),
  title: z.string().max(200).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  tags: z.array(z.string().max(64)).max(10).optional(),
}).refine((d) => (d.string?.trim() ?? "").length > 0 || (d.q?.trim() ?? "").length > 0, {
  message: "Market string or q required",
});
export type MarketCreateBody = z.infer<typeof marketCreateBodySchema>;

// --- Follow ---
export const followBodySchema = z.object({
  userId: z.string().min(1).optional(),
  followingId: z.string().min(1).optional(),
}).refine((d) => (d.userId ?? d.followingId)?.length, {
  message: "userId or followingId required",
});
export type FollowBody = z.infer<typeof followBodySchema>;

// --- Copy trading ---
export const copyTradingBodySchema = z.object({
  traderId: z.string().min(1).optional(),
  userId: z.string().min(1).optional(),
  allocation: z.number().min(0).max(1).default(1),
}).refine((d) => (d.traderId ?? d.userId)?.length, {
  message: "traderId or userId required",
});
export type CopyTradingBody = z.infer<typeof copyTradingBodySchema>;

// --- Governance vote ---
export const governanceVoteBodySchema = z.object({
  proposalId: z.string().min(1, "proposalId required"),
  vote: z.enum(["for", "against", "abstain"]),
});
export type GovernanceVoteBody = z.infer<typeof governanceVoteBodySchema>;

// --- Auth register (username required; confirm_password must match password) ---
const usernameRequiredSchema = z
  .string()
  .min(1, "Username required")
  .max(64)
  .transform((s) => s.trim())
  .refine((s) => s.length >= 3, "Username must be at least 3 characters")
  .transform((s) => {
    const r = validateIdentifierSafe(s);
    if (!r.ok) throw new z.ZodError([{ code: "custom", path: [], message: r.error }]);
    return r.value;
  });

export const registerBodySchema = z
  .object({
    email: z.string().email("Invalid email").transform((s) => s.trim().toLowerCase()),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirm_password: z.string().min(1, "Confirm password"),
    name: z.string().max(100).transform((s) => s.trim()).optional().nullable(),
    username: usernameRequiredSchema,
    referralCode: z.string().max(32).transform((s) => s.trim().toUpperCase()).optional().nullable(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Password and confirm password do not match",
    path: ["confirm_password"],
  });
export type RegisterBody = z.infer<typeof registerBodySchema>;

// --- Wallet connect (minimal) ---
export const walletConnectBodySchema = z.object({
  walletAddress: z.string().min(1, "walletAddress required").max(64),
  chain: z.enum(["ethereum", "solana"]),
  signature: z.string().optional(),
  message: z.string().optional(),
});
export type WalletConnectBody = z.infer<typeof walletConnectBodySchema>;

// --- Comments ---
export const commentBodySchema = z.object({
  body: z.string().min(1, "Comment required").max(2000).transform((s) => s.trim()),
});
export type CommentBody = z.infer<typeof commentBodySchema>;

// --- Invite redeem ---
export const inviteRedeemBodySchema = z.object({
  code: z.string().min(1, "Code required").max(64).transform((s) => s.trim().toUpperCase()),
});
export type InviteRedeemBody = z.infer<typeof inviteRedeemBodySchema>;

// --- Admin treasury transfer ---
export const treasuryTransferBodySchema = z.object({
  toUserId: z.string().min(1),
  amount: positiveNumber,
  reason: z.string().max(500).optional(),
});
export type TreasuryTransferBody = z.infer<typeof treasuryTransferBodySchema>;

/**
 * Parse JSON body with schema; returns { success: true, data } or { success: false, error: string }.
 * Use in route handlers to return 400 with clear message.
 */
export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (result.success) return { success: true, data: result.data };
  const first = result.error.flatten().formErrors[0] ?? result.error.message;
  return { success: false, error: first };
}

/**
 * Parse query params with schema.
 */
export function parseQuery<T>(schema: z.ZodSchema<T>, params: Record<string, string | string[] | undefined>): { success: true; data: T } | { success: false; error: string } {
  const single: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    single[k] = Array.isArray(v) ? v[0] ?? "" : (v ?? "");
  }
  const result = schema.safeParse(single);
  if (result.success) return { success: true, data: result.data };
  const first = result.error.flatten().formErrors[0] ?? result.error.message;
  return { success: false, error: first };
}
