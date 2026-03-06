import { NextRequest, NextResponse } from "next/server";
import { getAsset } from "@/lib/marketplace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const asset = await getAsset(id);
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  return NextResponse.json(asset);
}
