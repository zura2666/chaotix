import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateUserMarketplaceTrust } from "@/lib/marketplace-trust";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { tradeId?: string; toUserId?: string; rating?: number; comment?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { tradeId, toUserId, rating, comment } = body;
  if (!tradeId?.trim()) return NextResponse.json({ error: "tradeId required" }, { status: 400 });
  if (!toUserId?.trim()) return NextResponse.json({ error: "toUserId required" }, { status: 400 });
  const r = Number(rating);
  if (!Number.isFinite(r) || r < 1 || r > 5) {
    return NextResponse.json({ error: "rating must be 1-5" }, { status: 400 });
  }

  const trade = await prisma.assetTrade.findUnique({
    where: { id: tradeId },
    select: { id: true, buyerId: true, sellerId: true },
  });
  if (!trade) return NextResponse.json({ error: "Trade not found" }, { status: 404 });
  if (trade.buyerId !== user.id && trade.sellerId !== user.id) {
    return NextResponse.json({ error: "You can only leave feedback for your own trade" }, { status: 403 });
  }
  if (toUserId !== trade.buyerId && toUserId !== trade.sellerId) {
    return NextResponse.json({ error: "toUserId must be the other party in the trade" }, { status: 400 });
  }
  if (toUserId === user.id) return NextResponse.json({ error: "Cannot rate yourself" }, { status: 400 });

  await prisma.tradeFeedback.upsert({
    where: {
      tradeId_fromUserId_toUserId: {
        tradeId,
        fromUserId: user.id,
        toUserId,
      },
    },
    create: {
      tradeId,
      fromUserId: user.id,
      toUserId,
      rating: Math.round(r),
      comment: comment?.trim().slice(0, 500) ?? null,
    },
    update: {
      rating: Math.round(r),
      comment: comment?.trim().slice(0, 500) ?? null,
    },
  });

  await updateUserMarketplaceTrust(toUserId);
  return NextResponse.json({ ok: true });
}
