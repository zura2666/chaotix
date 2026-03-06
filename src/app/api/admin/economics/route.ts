import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getSession();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalFees,
    totalReferralPayouts,
    tradesLast24h,
    volumeLast24h,
    newUsersLast24h,
    newMarketsLast24h,
    tradesLast7d,
  ] = await Promise.all([
    prisma.trade.aggregate({ _sum: { fee: true } }),
    prisma.referralEarning.aggregate({ _sum: { amount: true } }),
    prisma.trade.count({ where: { createdAt: { gte: since24h } } }),
    prisma.trade.aggregate({
      _sum: { total: true },
      where: { createdAt: { gte: since24h } },
    }),
    prisma.user.count({ where: { createdAt: { gte: since24h } } }),
    prisma.market.count({ where: { createdAt: { gte: since24h } } }),
    prisma.trade.findMany({
      where: { createdAt: { gte: since7d } },
      select: { createdAt: true },
    }),
  ]);

  const dayCounts = new Map<string, number>();
  for (const t of tradesLast7d) {
    const day = t.createdAt.toISOString().slice(0, 10);
    dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }
  const tradesByDay = Array.from(dayCounts.entries())
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day));

  const platformRevenue = (totalFees._sum.fee ?? 0) - (totalReferralPayouts._sum.amount ?? 0);

  return NextResponse.json({
    platformRevenue,
    totalFees: totalFees._sum.fee ?? 0,
    totalReferralPayouts: totalReferralPayouts._sum.amount ?? 0,
    last24h: {
      trades: tradesLast24h,
      volume: volumeLast24h._sum.total ?? 0,
      newUsers: newUsersLast24h,
      newMarkets: newMarketsLast24h,
    },
    tradesByDay,
  });
}
