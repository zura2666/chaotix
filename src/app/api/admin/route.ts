import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const [userCount, marketCount, tradeCount, volume, recentTrades, failedAttempts] =
    await Promise.all([
      prisma.user.count(),
      prisma.market.count(),
      prisma.trade.count(),
      prisma.trade.aggregate({ _sum: { total: true } }),
      prisma.trade.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          user: { select: { email: true, name: true } },
          market: { select: { displayName: true, canonical: true } },
        },
      }),
      prisma.tradeAttempt.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
    ]);
  return NextResponse.json({
    metrics: {
      userCount,
      marketCount,
      tradeCount,
      totalVolume: volume._sum.total ?? 0,
    },
    recentTrades,
    failedAttempts,
  });
}
