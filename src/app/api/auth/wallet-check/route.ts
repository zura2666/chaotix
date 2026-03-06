import { NextRequest, NextResponse } from "next/server";
import { findUserByWallet } from "@/lib/auth";

/**
 * GET /api/auth/wallet-check?address=0x...
 * Returns whether the wallet exists and if the user has a password (profile complete).
 * Used by the auth modal to decide: show SIWE sign-in vs "Complete Your Account" form.
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")?.trim();
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }
  const user = await findUserByWallet(address);
  if (!user) {
    return NextResponse.json({ exists: false });
  }
  return NextResponse.json({
    exists: true,
    hasPassword: Boolean(user.passwordHash),
  });
}
