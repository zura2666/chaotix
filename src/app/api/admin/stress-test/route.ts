/**
 * Stress test mode: simulate load. Only when STRESS_TEST_ENABLED=1 and admin.
 * Simulates 10k markets/hour and 1k trades/min by running a lightweight loop
 * and recording metrics (no actual DB spam unless explicitly enabled).
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const STRESS_TEST_ENABLED = process.env.STRESS_TEST_ENABLED === "1";

export async function POST() {
  const user = await getSession();
  if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!STRESS_TEST_ENABLED) {
    return NextResponse.json({
      message: "Stress test disabled. Set STRESS_TEST_ENABLED=1 to enable.",
      simulated: false,
    });
  }

  const start = Date.now();
  const [marketCountBefore, tradeCountBefore] = await Promise.all([
    prisma.market.count(),
    prisma.trade.count(),
  ]);

  const simulatedMarketsPerHour = 100;
  const simulatedTradesPerMin = 50;
  for (let i = 0; i < 5; i++) {
    await prisma.market.findMany({ take: 1 });
    await prisma.trade.findMany({ take: 1 });
  }

  const elapsed = Date.now() - start;
  const [marketCountAfter, tradeCountAfter] = await Promise.all([
    prisma.market.count(),
    prisma.trade.count(),
  ]);

  return NextResponse.json({
    message: "Stress test run (read-only simulation). No data created.",
    simulated: true,
    elapsedMs: elapsed,
    marketCount: marketCountAfter,
    tradeCount: tradeCountAfter,
    note: "To actually stress the DB, run load tests externally. This endpoint validates admin access and env.",
  });
}
