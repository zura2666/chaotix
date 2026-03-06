import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit429 } from "@/lib/rate-limit";
import { PUBLIC_API_RATE_LIMIT_PER_MINUTE } from "@/lib/constants";

function rateLimitKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "anon";
  return `protocol:trades:${ip}`;
}

const WINDOW_MS = 60 * 1000;

export async function GET(req: NextRequest) {
  const rl = await rateLimit429(rateLimitKey(req), PUBLIC_API_RATE_LIMIT_PER_MINUTE, WINDOW_MS);
  if (rl) return rl;
  const limit = Math.min(200, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10) || 50));
  const marketId = req.nextUrl.searchParams.get("marketId") ?? undefined;
  const trades = await prisma.trade.findMany({
    where: marketId ? { marketId } : undefined,
    select: { id: true, marketId: true, side: true, shares: true, price: true, total: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json({ trades });
}
