import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-nextauth";
import { prisma } from "@/lib/db";
import { getSession as getLegacySession } from "@/lib/auth";

/**
 * GET /api/auth/callback
 * After OAuth or wallet sign-in, check session: if user exists and has full profile, they're logged in;
 * if user exists but needs username/password (needsProfileCompletion), client should show profile completion.
 * Same contract as /api/auth/me for consistency.
 */
export async function GET(_req: NextRequest) {
  const nextAuthSession = await auth();
  if (nextAuthSession?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: nextAuthSession.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        referralCode: true,
        balance: true,
        isAdmin: true,
        isBanned: true,
        image: true,
        walletAddress: true,
        passwordHash: true,
      },
    });
    if (dbUser && !dbUser.isBanned) {
      return NextResponse.json({
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          username: dbUser.username,
          referralCode: dbUser.referralCode,
          balance: dbUser.balance,
          isAdmin: dbUser.isAdmin,
        },
        needsProfileCompletion: !dbUser.passwordHash,
      });
    }
  }

  const legacyUser = await getLegacySession();
  if (legacyUser) {
    const withPassword = await prisma.user.findUnique({
      where: { id: legacyUser.id },
      select: { passwordHash: true },
    });
    return NextResponse.json({
      user: {
        id: legacyUser.id,
        email: legacyUser.email,
        name: legacyUser.name,
        username: legacyUser.username,
        referralCode: legacyUser.referralCode,
        balance: legacyUser.balance,
        isAdmin: legacyUser.isAdmin,
      },
      needsProfileCompletion: !withPassword?.passwordHash,
    });
  }

  return NextResponse.json({ user: null, needsProfileCompletion: false }, { status: 200 });
}
