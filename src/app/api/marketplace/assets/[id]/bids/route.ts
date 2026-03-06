import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createBid } from "@/lib/marketplace";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: assetId } = await params;
  let body: { quantity?: number; unitPrice?: number; expiresAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const quantity = Number(body.quantity);
  const unitPrice = Number(body.unitPrice);
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
    return NextResponse.json({ error: "quantity and unitPrice required" }, { status: 400 });
  }
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : undefined;
  const result = await createBid(assetId, user.id, quantity, unitPrice, expiresAt);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ id: result.id });
}
