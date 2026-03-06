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
        seasonScore: true,
        roiRank: true,
        volumeRank: true,
        narrativeRank: true,
        rankTitle: true,
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
          seasonScore: dbUser.seasonScore,
          roiRank: dbUser.roiRank,
          volumeRank: dbUser.volumeRank,
          narrativeRank: dbUser.narrativeRank,
          rankTitle: dbUser.rankTitle ?? undefined,
        },
        needsProfileCompletion: !dbUser.passwordHash,
      });
    }
  }

  const legacyUser = await getLegacySession();
  if (legacyUser) {
    const withPassword = await prisma.user.findUnique({
      where: { id: legacyUser.id },
      select: { passwordHash: true, walletAddress: true, seasonScore: true, roiRank: true, volumeRank: true, narrativeRank: true, rankTitle: true },
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
        seasonScore: withPassword?.seasonScore,
        roiRank: withPassword?.roiRank,
        volumeRank: withPassword?.volumeRank,
        narrativeRank: withPassword?.narrativeRank,
        rankTitle: withPassword?.rankTitle ?? undefined,
      },
      needsProfileCompletion: !withPassword?.passwordHash,
    });
  }

  return NextResponse.json({ user: null }, { status: 200 });
}
