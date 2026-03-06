import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { tradeId?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { tradeId, reason } = body;
  if (!tradeId?.trim()) return NextResponse.json({ error: "tradeId required" }, { status: 400 });
  if (!reason?.trim()) return NextResponse.json({ error: "reason required" }, { status: 400 });

  const trade = await prisma.assetTrade.findUnique({
    where: { id: tradeId },
    select: { id: true, buyerId: true, sellerId: true, dispute: true },
  });
  if (!trade) return NextResponse.json({ error: "Trade not found" }, { status: 404 });
  if (trade.buyerId !== user.id && trade.sellerId !== user.id) {
    return NextResponse.json({ error: "You can only open a dispute on your own trade" }, { status: 403 });
  }
  if (trade.dispute) return NextResponse.json({ error: "Dispute already exists for this trade" }, { status: 400 });

  const dispute = await prisma.marketplaceDispute.create({
    data: {
      tradeId: trade.id,
      openedById: user.id,
      reason: reason.trim().slice(0, 1000),
      status: "open",
    },
  });
  return NextResponse.json({ id: dispute.id });
}

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isAdmin: true },
  }).then((u) => u?.isAdmin ?? false);

  const where = isAdmin
    ? {}
    : {
        OR: [
          { openedById: user.id },
          { trade: { OR: [{ buyerId: user.id }, { sellerId: user.id }] } },
        ],
      };

  const disputes = await prisma.marketplaceDispute.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      trade: {
        select: {
          id: true,
          assetId: true,
          quantity: true,
          unitPrice: true,
          createdAt: true,
          asset: { select: { title: true } },
          buyer: { select: { id: true, username: true, name: true } },
          seller: { select: { id: true, username: true, name: true } },
        },
      },
    },
  });
  return NextResponse.json(disputes);
}
