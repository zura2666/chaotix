import { NextRequest, NextResponse } from "next/server";
import { getAssetTrades } from "@/lib/marketplace";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const limit = Math.min(100, parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10) || 50);
  const trades = await getAssetTrades(id, limit);
  return NextResponse.json({ trades });
}
