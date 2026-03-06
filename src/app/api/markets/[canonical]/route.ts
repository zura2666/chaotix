import { NextRequest, NextResponse } from "next/server";
import { getMarketByCanonical } from "@/lib/markets";
import { prisma } from "@/lib/db";
import { withQueryMetric } from "@/lib/query-metrics";

const TRADES_PAGE_SIZE = 20;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ canonical: string }> }
) {
  const { canonical } = await params;
  const decoded = decodeURIComponent(canonical);
  const result = await withQueryMetric(
    "market_page",
    async () => {
      const market = await getMarketByCanonical(decoded);
      if (!market) return { market: null as unknown, recentTrades: [] };
      const { searchParams } = new URL(req.url);
      const cursor = searchParams.get("cursor");
      const pageSize = Math.min(
        50,
        Math.max(1, parseInt(searchParams.get("limit") ?? String(TRADES_PAGE_SIZE), 10) || TRADES_PAGE_SIZE)
      );
      const recentTrades = await prisma.trade.findMany({
        where: { marketId: market.id },
        orderBy: { createdAt: "desc" },
        take: pageSize + 1,
        ...(cursor
          ? { cursor: { id: cursor }, skip: 1 }
          : {}),
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      const hasMore = recentTrades.length > pageSize;
      const list = hasMore ? recentTrades.slice(0, pageSize) : recentTrades;
      const nextCursor = hasMore ? list[list.length - 1]?.id : null;
      return {
        market: market
          ? {
              ...market,
              recentTrades: list,
              tradesNextCursor: nextCursor,
              hasMoreTrades: hasMore,
            }
          : null,
      };
    },
    { canonical: decoded }
  );
  if (!result.market) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
  }
  // Response includes derived metrics: attentionVelocity, momentumScore, uniqueTraders24h (Market model)
  return NextResponse.json({ market: result.market });
}
