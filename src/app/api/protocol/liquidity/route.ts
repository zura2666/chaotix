import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit429 } from "@/lib/rate-limit";
import { PUBLIC_API_RATE_LIMIT_PER_MINUTE } from "@/lib/constants";

function rateLimitKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "anon";
  return `protocol:liquidity:${ip}`;
}

const WINDOW_MS = 60 * 1000;

export async function GET(req: NextRequest) {
  const rl = await rateLimit429(rateLimitKey(req), PUBLIC_API_RATE_LIMIT_PER_MINUTE, WINDOW_MS);
  if (rl) return rl;
  const marketId = req.nextUrl.searchParams.get("marketId") ?? undefined;
  const pools = await prisma.liquidityPool.findMany({
    where: marketId ? { marketId } : undefined,
    select: { marketId: true, totalLiquidity: true, totalLpShares: true },
  });
  return NextResponse.json({ liquidity: pools });
}
