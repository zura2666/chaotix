import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { removeLiquidity, getMarketLpSummary } from "@/lib/liquidity";
import { resolveCanonical } from "@/lib/canonicalization";

/** POST /api/liquidity/remove — remove liquidity by marketId or canonical. */
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { marketId?: string; canonical?: string; lpTokensToBurn?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const lpTokensToBurn = Number(body.lpTokensToBurn);
  if (!Number.isFinite(lpTokensToBurn) || lpTokensToBurn <= 0) {
    return NextResponse.json({ error: "Valid lpTokensToBurn required" }, { status: 400 });
  }

  let marketId: string | null = body.marketId ?? null;
  if (!marketId && body.canonical) {
    const canonical = await resolveCanonical(body.canonical) ?? body.canonical.trim().toLowerCase();
    const m = await prisma.market.findUnique({ where: { canonical }, select: { id: true } });
    marketId = m?.id ?? null;
  }
  if (!marketId) {
    return NextResponse.json({ error: "marketId or canonical required" }, { status: 400 });
  }

  const result = await removeLiquidity({
    userId: user.id,
    marketId,
    lpTokensToBurn,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const summary = await getMarketLpSummary(marketId);
  return NextResponse.json({
    ...result,
    summary: summary ?? undefined,
  });
}
