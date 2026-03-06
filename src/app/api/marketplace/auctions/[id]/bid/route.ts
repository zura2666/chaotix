import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: auctionId } = await params;
  let body: { amount?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "amount required (positive number)" }, { status: 400 });
  }

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: { asset: true },
  });
  if (!auction) return NextResponse.json({ error: "Auction not found" }, { status: 404 });
  if (auction.status !== "active") return NextResponse.json({ error: "Auction not active" }, { status: 400 });
  if (new Date() > auction.endAt) return NextResponse.json({ error: "Auction ended" }, { status: 400 });
  if (amount < auction.minBid) return NextResponse.json({ error: "Bid below minimum" }, { status: 400 });

  const topBid = await prisma.auctionBid.findFirst({
    where: { auctionId },
    orderBy: { amount: "desc" },
    select: { bidderId: true, amount: true },
  });
  if (topBid && amount <= topBid.amount) {
    return NextResponse.json({ error: "Bid must exceed current highest (" + topBid.amount + ")" }, { status: 400 });
  }

  await prisma.auctionBid.create({
    data: { auctionId, bidderId: user.id, amount },
  });

  if (topBid && topBid.bidderId !== user.id) {
    createNotification({
      userId: topBid.bidderId,
      type: "bid_outbid",
      title: "You were outbid",
      body: `Your bid on ${auction.asset.title} was outbid.`,
      link: `/marketplace/${auction.assetId}`,
      payload: { auctionId, assetId: auction.assetId, newBid: amount },
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true });
}
