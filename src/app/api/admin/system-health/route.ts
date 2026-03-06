import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const WINDOW_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET() {
  const user = await getSession();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const since = new Date(Date.now() - WINDOW_MS);
  const dayAgo = new Date(Date.now() - DAY_MS);

  const [
    tradeAttempts,
    failedAttempts,
    marketsPaused,
    marketsArchived,
    recentAlerts,
    tradeCount,
    liquiditySnapshot,
  ] = await Promise.all([
    prisma.tradeAttempt.count({ where: { createdAt: { gte: since } } }),
    prisma.tradeAttempt.count({
      where: { createdAt: { gte: since }, error: { not: null } },
    }),
    prisma.market.count({
      where: { circuitBreakerUntil: { gt: new Date() } },
    }),
    prisma.market.count({ where: { status: "archived" } }),
    prisma.adminAlert.findMany({
      where: { createdAt: { gte: dayAgo }, readAt: null },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, type: true, severity: true, message: true, createdAt: true },
    }),
    prisma.trade.count({ where: { createdAt: { gte: since } } }),
    prisma.market.aggregate({
      where: { status: "active" },
      _sum: { reserveTokens: true, volume: true },
      _count: true,
    }),
  ]);

  const failureRate = tradeAttempts > 0 ? (failedAttempts / tradeAttempts) * 100 : 0;
  const activeMarkets = (liquiditySnapshot._count ?? 0) - marketsArchived;
  const totalReserve = liquiditySnapshot._sum.reserveTokens ?? 0;
  const totalVolume = liquiditySnapshot._sum.volume ?? 0;

  await prisma.systemHealthMetric.create({
    data: {
      kind: "snapshot",
      value: failureRate,
      payload: JSON.stringify({
        tradeAttempts,
        failedAttempts,
        marketsPaused,
        marketsArchived,
        activeMarkets,
        tradeCountLastHour: tradeCount,
        totalReserve,
        totalVolume,
      }),
    },
  });

  return NextResponse.json({
    ok: failureRate < 50 && marketsPaused < activeMarkets * 0.5,
    window: "1h",
    metrics: {
      tradeAttemptsLastHour: tradeAttempts,
      failedTradeAttempts: failedAttempts,
      failureRatePercent: Math.round(failureRate * 10) / 10,
      marketsCurrentlyPaused: marketsPaused,
      marketsArchived,
      activeMarkets,
      tradesLastHour: tradeCount,
      totalLiquidityReserve: totalReserve,
      totalVolumeAllTime: totalVolume,
    },
    alerts: recentAlerts,
    summary:
      failureRate >= 50
        ? "High trade failure rate"
        : marketsPaused >= Math.max(1, activeMarkets * 0.5)
          ? "Many markets in circuit breaker"
          : "Operational",
  });
}
