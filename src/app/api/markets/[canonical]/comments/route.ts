/**
 * Market comments: list and create.
 * GET /api/markets/[canonical]/comments — list
 * POST /api/markets/[canonical]/comments — create (body: { body, sentiment? })
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMarketByCanonical } from "@/lib/markets";
import { MARKET_STATUS_ARCHIVED } from "@/lib/constants";
import { updateAttentionAfterComment } from "@/lib/attention";
import { assertCsrf } from "@/lib/csrf";

const SENTIMENTS = ["bullish", "bearish", "neutral"] as const;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ canonical: string }> }
) {
  const { canonical } = await params;
  const market = await getMarketByCanonical(decodeURIComponent(canonical));
  if (!market) return NextResponse.json({ error: "Market not found" }, { status: 404 });
  const comments = await prisma.marketComment.findMany({
    where: { marketId: market.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
  const sentimentCounts = { bullish: 0, bearish: 0, neutral: 0 };
  for (const co of comments) {
    if (co.sentiment && SENTIMENTS.includes(co.sentiment as (typeof SENTIMENTS)[number])) {
      sentimentCounts[co.sentiment as keyof typeof sentimentCounts]++;
    }
  }
  const sentiment =
    comments.length === 0
      ? "neutral"
      : sentimentCounts.bullish > sentimentCounts.bearish
        ? "bullish"
        : sentimentCounts.bearish > sentimentCounts.bullish
          ? "bearish"
          : "neutral";
  return NextResponse.json({
    comments: comments.map((co) => ({
      id: co.id,
      body: co.body,
      sentiment: co.sentiment,
      createdAt: co.createdAt.toISOString(),
      user: co.user,
    })),
    sentiment,
    sentimentCounts,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ canonical: string }> }
) {
  const csrfError = assertCsrf(req);
  if (csrfError) return csrfError;
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { canonical } = await params;
  const market = await getMarketByCanonical(decodeURIComponent(canonical));
  if (!market) return NextResponse.json({ error: "Market not found" }, { status: 404 });
  if (market.status === MARKET_STATUS_ARCHIVED) {
    return NextResponse.json({ error: "Market is archived" }, { status: 400 });
  }
  let body: { body?: string; sentiment?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = typeof body.body === "string" ? body.body.trim().slice(0, 2000) : "";
  if (!text) return NextResponse.json({ error: "Comment body required" }, { status: 400 });
  const sentiment =
    typeof body.sentiment === "string" && SENTIMENTS.includes(body.sentiment as (typeof SENTIMENTS)[number])
      ? body.sentiment
      : null;
  const comment = await prisma.marketComment.create({
    data: {
      marketId: market.id,
      userId: user.id,
      body: text,
      sentiment,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
  updateAttentionAfterComment(market.id).catch(() => {});
  const { updateMarketSentiment } = await import("@/lib/market-sentiment");
  updateMarketSentiment(market.id).catch(() => {});
  return NextResponse.json({
    comment: {
      id: comment.id,
      body: comment.body,
      sentiment: comment.sentiment,
      createdAt: comment.createdAt.toISOString(),
      user: comment.user,
    },
  });
}
