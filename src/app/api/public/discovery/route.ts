import { NextRequest, NextResponse } from "next/server";
import { getDiscoveryFeed } from "@/lib/discovery-feed";
import { rateLimit429 } from "@/lib/rate-limit";
import { PUBLIC_API_RATE_LIMIT_PER_MINUTE } from "@/lib/constants";

function rateLimitKey(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? req.headers.get("x-real-ip") ?? "anon";
  return `public:discovery:${ip}`;
}

const WINDOW_MS = 60 * 1000;

export async function GET(req: NextRequest) {
  const rl = await rateLimit429(rateLimitKey(req), PUBLIC_API_RATE_LIMIT_PER_MINUTE, WINDOW_MS);
  if (rl) return rl;
  const limit = Math.min(30, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10) || 20));
  const feed = await getDiscoveryFeed(limit);
  return NextResponse.json({ feed });
}
