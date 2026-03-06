import { NextRequest, NextResponse } from "next/server";
import { getMarketAttention, getAttentionRanked } from "@/lib/attention";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const marketId = req.nextUrl.searchParams.get("marketId");
  if (marketId) {
    const data = await getMarketAttention(marketId);
    return NextResponse.json(data);
  }
  const ranked = await getAttentionRanked(30);
  const marketIds = ranked.map((r) => r.marketId);
  const markets = await prisma.market.findMany({
    where: { id: { in: marketIds } },
    select: { id: true, canonical: true, displayName: true, price: true, volume: true },
  });
  const byId = new Map(markets.map((m) => [m.id, m]));
  const list = ranked.map((r) => ({
    ...byId.get(r.marketId),
    attentionScore: r.attentionScore,
  }));
  return NextResponse.json({ ranked: list });
}
