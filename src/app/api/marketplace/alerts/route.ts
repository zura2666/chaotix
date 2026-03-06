import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const alerts = await prisma.assetPriceAlert.findMany({
    where: { userId: user.id, active: true },
    include: { asset: { select: { id: true, title: true, currentPrice: true } } },
  });
  return NextResponse.json({ alerts });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { assetId?: string; direction?: string; threshold?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { assetId, direction, threshold } = body;
  if (!assetId || !direction || direction !== "above" && direction !== "below" || !Number.isFinite(threshold)) {
    return NextResponse.json({ error: "assetId, direction (above|below), threshold required" }, { status: 400 });
  }

  const asset = await prisma.asset.findUnique({ where: { id: assetId }, select: { id: true } });
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  const alert = await prisma.assetPriceAlert.upsert({
    where: { userId_assetId: { userId: user.id, assetId } },
    create: { userId: user.id, assetId, direction, threshold, active: true },
    update: { direction, threshold, active: true },
  });
  return NextResponse.json({ id: alert.id });
}

export async function DELETE(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const assetId = req.nextUrl.searchParams.get("assetId");
  if (!assetId) return NextResponse.json({ error: "assetId required" }, { status: 400 });

  await prisma.assetPriceAlert.deleteMany({
    where: { userId: user.id, assetId },
  });
  return NextResponse.json({ ok: true });
}
