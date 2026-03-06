import { NextRequest, NextResponse } from "next/server";
import {
  createUserWithWallet,
  completeProfileForOAuthUser,
  completeProfileForWalletUser,
  findUserByWallet,
  applySessionToResponse,
} from "@/lib/auth";
import { auth } from "@/lib/auth-nextauth";
import { getSession as getLegacySession } from "@/lib/auth";
import { z } from "zod";

const walletBodySchema = z.object({
  origin: z.literal("wallet"),
  walletAddress: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(3).max(32),
  password: z.string().min(8),
  referralCode: z.string().optional(),
});

const googleBodySchema = z.object({
  origin: z.literal("google"),
  username: z.string().min(3).max(32),
  password: z.string().min(8),
  referralCode: z.string().optional(),
});

/**
 * POST /api/auth/complete-profile
 * Wallet path: create full user (wallet + email + username + password).
 * Google path: complete existing OAuth user with username + password (requires session).
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const origin = (body as { origin?: string }).origin;
  if (origin === "wallet") {
    const parsed = walletBodySchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ error: Object.values(msg).flat().join(" ") }, { status: 400 });
    }
    const { walletAddress, email, username, password, referralCode } = parsed.data;
    const normalized = walletAddress.trim().toLowerCase();
    if (!normalized.startsWith("0x")) {
      return NextResponse.json({ error: "Invalid wallet address" }, { status: 400 });
    }
    const existingWalletUser = await findUserByWallet(normalized);
    let result: { user: { id: string; email: string | null; username: string | null; referralCode: string; balance: number } } | { id: string; email: string | null; username: string | null; referralCode: string; balance: number } | { error: string };
    if (existingWalletUser && !existingWalletUser.passwordHash) {
      result = await completeProfileForWalletUser(normalized, {
        username,
        email,
        password,
        referralCode,
      });
    } else {
      result = await createUserWithWallet({
        walletAddress: normalized,
        email,
        username,
        password,
        referralCode,
      });
    }
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const user = "user" in result ? result.user : result;
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        referralCode: user.referralCode,
        balance: user.balance,
      },
    });
    return applySessionToResponse(response, user.id);
  }

  if (origin === "google") {
    const parsed = googleBodySchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.flatten().fieldErrors;
      return NextResponse.json({ error: Object.values(msg).flat().join(" ") }, { status: 400 });
    }
    const nextAuthSession = await auth();
    const legacySession = await getLegacySession();
    const userId = nextAuthSession?.user?.id ?? legacySession?.id ?? null;
    if (!userId) {
      return NextResponse.json({ error: "You must be signed in to complete your profile." }, { status: 401 });
    }
    const result = await completeProfileForOAuthUser(userId, {
      username: parsed.data.username,
      password: parsed.data.password,
      referralCode: parsed.data.referralCode,
    });
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      user: result
        ? {
            id: result.id,
            email: result.email,
            username: result.username,
            referralCode: result.referralCode,
            balance: result.balance,
          }
        : null,
    });
  }

  return NextResponse.json({ error: "Invalid origin" }, { status: 400 });
}
