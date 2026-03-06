import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [referredUsers, earnings, referralVolume] = await Promise.all([
    prisma.user.findMany({
      where: { referredById: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    }),
    prisma.referralEarning.aggregate({
      where: { referrerId: user.id },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.trade.aggregate({
      where: { user: { referredById: user.id } },
      _sum: { total: true },
      _count: true,
    }),
  ]);
  const referredIds = referredUsers.map((u) => u.id);
  const volumeByReferred =
    referredIds.length > 0
      ? await prisma.trade.groupBy({
          by: ["userId"],
          where: { userId: { in: referredIds } },
          _sum: { total: true },
        })
      : [];
  const volumeByUser = Object.fromEntries(
    volumeByReferred.map((v) => [v.userId, v._sum.total ?? 0])
  );
  return NextResponse.json({
    referralCode: user.referralCode,
    referredUsers: referredUsers.map((u) => ({
      ...u,
      totalVolume: volumeByUser[u.id] ?? 0,
    })),
    totalEarnings: earnings._sum.amount ?? 0,
    earningCount: earnings._count,
    referralVolume: referralVolume._sum.total ?? 0,
    referralTradeCount: referralVolume._count,
    analytics: {
      totalReferred: referredUsers.length,
      avgEarningsPerReferred:
        referredUsers.length > 0
          ? (earnings._sum.amount ?? 0) / referredUsers.length
          : 0,
    },
  });
}
