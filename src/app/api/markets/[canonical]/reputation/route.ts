import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMarketReputation } from "@/lib/market-reputation";
import { resolveCanonical } from "@/lib/canonicalization";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ canonical: string }> }
) {
  const { canonical } = await params;
  const decoded = decodeURIComponent(canonical);
  const key = (await resolveCanonical(decoded)) ?? decoded.trim().toLowerCase();
  const market = await prisma.market.findUnique({
    where: { canonical: key },
    select: { id: true },
  });
  if (!market) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
  }
  const reputation = await getMarketReputation(market.id);
  return NextResponse.json(reputation ?? {
    marketId: market.id,
    traderCount: 0,
    tradeCount: 0,
    volumeScore: 0,
    ageScore: 0,
    reputationScore: 0,
    updatedAt: new Date(),
  });
}
