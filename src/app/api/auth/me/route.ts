import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-nextauth";
import { prisma } from "@/lib/db";
import { getSession as getLegacySession } from "@/lib/auth";

export async function GET() {
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
          walletAddress: dbUser.walletAddress ?? undefined,
        },
        needsProfileCompletion: !dbUser.passwordHash,
      });
    }
  }

  const legacyUser = await getLegacySession();
  if (legacyUser) {
    const withPassword = await prisma.user.findUnique({
      where: { id: legacyUser.id },
      select: { passwordHash: true, walletAddress: true },
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
        walletAddress: withPassword?.walletAddress ?? undefined,
      },
      needsProfileCompletion: !withPassword?.passwordHash,
    });
  }

  return NextResponse.json({ user: null }, { status: 200 });
}
