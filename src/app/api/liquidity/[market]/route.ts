import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getMarketLpSummary } from "@/lib/liquidity";
import { resolveCanonical } from "@/lib/canonicalization";

/** GET /api/liquidity/[market] — get liquidity pool and LP summary. market = marketId or canonical. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ market: string }> }
) {
  const { market: marketParam } = await params;
  const decoded = decodeURIComponent(marketParam);

  let marketId: string | null = null;
  const byId = await prisma.market.findUnique({
    where: { id: decoded },
    select: { id: true, canonical: true },
  });
  if (byId) {
    marketId = byId.id;
  } else {
    const canonical = await resolveCanonical(decoded) ?? decoded.trim().toLowerCase();
    const m = await prisma.market.findUnique({
      where: { canonical },
      select: { id: true, canonical: true },
    });
    marketId = m?.id ?? null;
  }

  if (!marketId) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
  }

  const [summary, pool, marketRow] = await Promise.all([
    getMarketLpSummary(marketId),
    prisma.liquidityPool.findUnique({
      where: { marketId },
      select: { totalLiquidity: true, totalLpShares: true, createdAt: true },
    }),
    prisma.market.findUnique({
      where: { id: marketId },
      select: { reserveTokens: true, totalLpTokens: true },
    }),
  ]);
  const effectivePool = pool ?? (marketRow ? {
    totalLiquidity: marketRow.reserveTokens ?? 0,
    totalLpShares: marketRow.totalLpTokens ?? 0,
    createdAt: null as Date | null,
  } : null);

  const user = await getSession();
  let myPosition: { lpShares: number; liquidity: number; feesEarned: number } | null = null;
  if (user) {
    const pos = await prisma.liquidityPosition.findUnique({
      where: { userId_marketId: { userId: user.id, marketId } },
      select: { lpTokens: true, tokensDeposited: true, feesEarned: true },
    });
    if (pos) {
      myPosition = {
        lpShares: pos.lpTokens,
        liquidity: pos.tokensDeposited,
        feesEarned: pos.feesEarned,
      };
    }
  }

  return NextResponse.json({
    marketId,
    pool: effectivePool ?? { totalLiquidity: 0, totalLpShares: 0, createdAt: null },
    summary: summary ?? undefined,
    myPosition: myPosition ?? undefined,
  });
}
