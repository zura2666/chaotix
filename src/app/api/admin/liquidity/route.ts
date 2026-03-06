import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getSession();
  if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [pools, suspicious, alerts] = await Promise.all([
    prisma.liquidityPool.findMany({
      include: { market: { select: { id: true, canonical: true, displayName: true, volume: true } } },
      orderBy: { totalLiquidity: "desc" },
      take: 50,
    }),
    prisma.suspiciousActivity.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { market: { select: { canonical: true, displayName: true } } },
    }),
    prisma.manipulationAlert.findMany({
      where: { readAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  const totalLiquidity = pools.reduce((s, p) => s + p.totalLiquidity, 0);
  const distribution = pools.map((p) => ({
    marketId: p.marketId,
    canonical: p.market.canonical,
    displayName: p.market.displayName,
    totalLiquidity: p.totalLiquidity,
    totalLpShares: p.totalLpShares,
    volume: p.market.volume,
    sharePct: totalLiquidity > 0 ? (p.totalLiquidity / totalLiquidity) * 100 : 0,
  }));

  return NextResponse.json({
    biggestPools: distribution.slice(0, 20),
    totalPools: pools.length,
    totalLiquidity,
    suspiciousActivities: suspicious,
    manipulationAlerts: alerts,
  });
}
