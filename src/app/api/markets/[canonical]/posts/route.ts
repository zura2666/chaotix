/**
 * Market narrative feed (posts): list and create.
 * GET /api/markets/[canonical]/posts?sort=top|recent|insights
 * POST /api/markets/[canonical]/posts — create (body: { content, tradeId? })
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMarketByCanonical } from "@/lib/markets";
import { MARKET_STATUS_ARCHIVED } from "@/lib/constants";
import { assertCsrf } from "@/lib/csrf";

const SORT = ["top", "recent", "insights"] as const;
type Sort = (typeof SORT)[number];

function parseSort(s: string | null): Sort {
  if (s && SORT.includes(s as Sort)) return s as Sort;
  return "recent";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ canonical: string }> }
) {
  const { canonical } = await params;
  const market = await getMarketByCanonical(decodeURIComponent(canonical));
  if (!market) return NextResponse.json({ error: "Market not found" }, { status: 404 });
  const sort = parseSort(req.nextUrl.searchParams.get("sort"));
  const take = Math.min(Number(req.nextUrl.searchParams.get("limit")) || 20, 50);

  const baseWhere = { marketId: market.id };
  const where =
    sort === "insights"
      ? { ...baseWhere, tradeId: { not: null } }
      : baseWhere;

  const orderBy =
    sort === "top"
      ? [{ likes: "desc" as const }, { createdAt: "desc" as const }]
      : [{ createdAt: "desc" as const }];

  const posts = await prisma.marketPost.findMany({
    where,
    orderBy,
    take,
    include: {
      user: { select: { id: true, name: true, email: true } },
      trade: { select: { id: true, side: true, shares: true, price: true, createdAt: true } },
    },
  });

  return NextResponse.json({
    posts: posts.map((p) => ({
      id: p.id,
      userId: p.userId,
      marketId: p.marketId,
      content: p.content,
      likes: p.likes,
      tradeId: p.tradeId,
      createdAt: p.createdAt.toISOString(),
      user: p.user,
      trade: p.trade
        ? {
            id: p.trade.id,
            side: p.trade.side,
            shares: p.trade.shares,
            price: p.trade.price,
            createdAt: p.trade.createdAt.toISOString(),
          }
        : null,
    })),
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
  let body: { content?: string; tradeId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const content = typeof body.content === "string" ? body.content.trim().slice(0, 2000) : "";
  if (!content) return NextResponse.json({ error: "Post content required" }, { status: 400 });

  let tradeId: string | null = null;
  if (typeof body.tradeId === "string" && body.tradeId) {
    const trade = await prisma.trade.findFirst({
      where: { id: body.tradeId, marketId: market.id, userId: user.id },
    });
    if (trade) tradeId = trade.id;
  }

  const post = await prisma.marketPost.create({
    data: {
      marketId: market.id,
      userId: user.id,
      content,
      tradeId,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      trade: tradeId
        ? { select: { id: true, side: true, shares: true, price: true, createdAt: true } }
        : undefined,
    },
  });

  return NextResponse.json({
    post: {
      id: post.id,
      userId: post.userId,
      marketId: post.marketId,
      content: post.content,
      likes: post.likes,
      tradeId: post.tradeId,
      createdAt: post.createdAt.toISOString(),
      user: post.user,
      trade: post.trade
        ? {
            id: post.trade.id,
            side: post.trade.side,
            shares: post.trade.shares,
            price: post.trade.price,
            createdAt: post.trade.createdAt.toISOString(),
          }
        : null,
    },
  });
}
