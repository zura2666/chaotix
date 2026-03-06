import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit429 } from "@/lib/rate-limit";
import { PUBLIC_API_RATE_LIMIT_PER_MINUTE } from "@/lib/constants";

function rateLimitKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "anon";
  return `protocol:markets:${ip}`;
}

const WINDOW_MS = 60 * 1000;

export async function GET(req: NextRequest) {
  const rl = await rateLimit429(rateLimitKey(req), PUBLIC_API_RATE_LIMIT_PER_MINUTE, WINDOW_MS);
  if (rl) return rl;
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10) || 50));
  const markets = await prisma.market.findMany({
    where: { status: "active" },
    select: { id: true, canonical: true, displayName: true, price: true, volume: true, tradeCount: true, stage: true },
    orderBy: { tradeCount: "desc" },
    take: limit,
  });
  return NextResponse.json({ markets });
}
