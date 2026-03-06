import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { executeMarketSell } from "@/lib/marketplace";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: assetId } = await params;
  let body: { quantity?: number };
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const quantity = Number(body.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "quantity required (positive number)" }, { status: 400 });
  }
  const result = await executeMarketSell(assetId, user.id, quantity);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ tradeIds: result.tradeIds });
}
