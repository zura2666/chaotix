import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addLiquidity, getMarketLpSummary } from "@/lib/liquidity";
import { resolveCanonical } from "@/lib/canonicalization";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { marketId?: string; canonical?: string; amount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 1) {
    return NextResponse.json({ error: "Valid amount required (min 1)" }, { status: 400 });
  }

  let marketId: string | null = body.marketId ?? null;
  if (!marketId && body.canonical) {
    const canonical = (await resolveCanonical(body.canonical)) ?? body.canonical.trim().toLowerCase();
    const m = await prisma.market.findUnique({ where: { canonical }, select: { id: true } });
    marketId = m?.id ?? null;
  }
  if (!marketId) {
    return NextResponse.json({ error: "marketId or canonical required" }, { status: 400 });
  }

  const result = await addLiquidity({
    userId: user.id,
    marketId,
    tokensIn: amount,
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
