import { NextRequest, NextResponse } from "next/server";
import { getMarketByCanonical } from "@/lib/markets";
import { getMarketLpSummary } from "@/lib/liquidity";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ canonical: string }> }
) {
  const { canonical } = await params;
  const market = await getMarketByCanonical(decodeURIComponent(canonical));
  if (!market) return NextResponse.json({ error: "Market not found" }, { status: 404 });
  const summary = await getMarketLpSummary(market.id);
  return NextResponse.json(summary ?? {});
}
