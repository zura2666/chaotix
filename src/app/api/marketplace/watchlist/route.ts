import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { watchlistAssetIds, watchlistAssets, watchlistAdd, watchlistRemove } from "@/lib/marketplace";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const full = req.nextUrl.searchParams.get("full") === "1";
  if (full) {
    const assets = await watchlistAssets(user.id);
    return NextResponse.json({ assets });
  }
  const assetIds = await watchlistAssetIds(user.id);
  return NextResponse.json({ assetIds });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: { assetId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const assetId = body.assetId;
  if (!assetId) return NextResponse.json({ error: "assetId required" }, { status: 400 });
  const result = await watchlistAdd(user.id, assetId);
  if (!result.ok) return NextResponse.json({ error: result.error ?? "Failed" }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const assetId = req.nextUrl.searchParams.get("assetId");
  if (!assetId) return NextResponse.json({ error: "assetId required" }, { status: 400 });
  await watchlistRemove(user.id, assetId);
  return NextResponse.json({ ok: true });
}
