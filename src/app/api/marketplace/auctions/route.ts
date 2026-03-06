import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const assetId = req.nextUrl.searchParams.get("assetId");
  const status = req.nextUrl.searchParams.get("status") ?? "active";
  const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10) || 20);

  const where: { assetId?: string; status?: string } = {};
  if (assetId) where.assetId = assetId;
  if (status) where.status = status;

  const auctions = await prisma.auction.findMany({
    where,
    orderBy: { endAt: "asc" },
    take: limit,
    include: {
      asset: { select: { id: true, title: true } },
      seller: { select: { id: true, username: true, name: true } },
      _count: { select: { bids: true } },
    },
  });
  return NextResponse.json({ auctions });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { assetId?: string; quantity?: number; minBid?: number; endAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { assetId, quantity, minBid, endAt } = body;
  if (!assetId || !quantity || quantity <= 0 || !minBid || minBid <= 0) {
    return NextResponse.json({ error: "assetId, quantity, minBid required" }, { status: 400 });
  }

  const endDate = endAt ? new Date(endAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  if (endDate <= new Date()) return NextResponse.json({ error: "endAt must be in future" }, { status: 400 });

  const holding = await prisma.assetHolding.findUnique({
    where: { userId_assetId: { userId: user.id, assetId } },
    select: { quantity: true },
  });
  if (!holding || holding.quantity < quantity) {
    return NextResponse.json({ error: "Insufficient balance to auction" }, { status: 400 });
  }

  const auction = await prisma.$transaction(async (tx) => {
    const a = await tx.auction.create({
      data: {
        assetId,
        sellerId: user.id,
        quantity,
        startAt: new Date(),
        endAt: endDate,
        minBid,
        status: "active",
      },
    });
    await tx.assetHolding.update({
      where: { userId_assetId: { userId: user.id, assetId } },
      data: { quantity: { decrement: quantity } },
    });
    return a;
  });

  return NextResponse.json({ id: auction.id });
}
