import { NextRequest, NextResponse } from "next/server";
import { getMarketByCanonical } from "@/lib/markets";
import { getViralSharePayload } from "@/lib/viral-share";

/**
 * Viral share: auto-generated share text with price change, volume, link preview.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ canonical: string }> }
) {
  const { canonical } = await params;
  const market = await getMarketByCanonical(decodeURIComponent(canonical));
  if (!market) return NextResponse.json({ error: "Market not found" }, { status: 404 });
  const payload = await getViralSharePayload(market.canonical);
  if (!payload.displayName) return NextResponse.json({ error: "Market not found" }, { status: 404 });
  return NextResponse.json(payload);
}
