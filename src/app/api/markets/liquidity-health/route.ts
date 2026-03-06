import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMarketByCanonical } from "@/lib/markets";
import { computeLiquidityHealth } from "@/lib/liquidity-health";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const marketId = searchParams.get("marketId");
  const canonical = searchParams.get("canonical");
  if (!marketId && !canonical) {
    return NextResponse.json(
      { error: "marketId or canonical required" },
      { status: 400 }
    );
  }
  const market = marketId
    ? await prisma.market.findUnique({
        where: { id: marketId },
        include: { positions: { select: { shares: true, userId: true } } },
      })
    : await getMarketByCanonical(canonical!);
  if (!market) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
  }
  const health = computeLiquidityHealth({
    reserveTokens: market.reserveTokens,
    reserveShares: market.reserveShares,
    price: market.price,
    volume: market.volume,
    tradeCount: market.tradeCount,
    positions: market.positions,
  });
  return NextResponse.json({ marketId: market.id, canonical: market.canonical, ...health });
}
