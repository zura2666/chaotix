import { NextRequest, NextResponse } from "next/server";
import { getAssetPriceHistory } from "@/lib/marketplace";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const limit = Math.min(500, parseInt(req.nextUrl.searchParams.get("limit") ?? "200", 10) || 200);
  const history = await getAssetPriceHistory(id, limit);
  return NextResponse.json({ history });
}
