import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-nextauth";
import { getSession as getLegacySession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const nextAuth = await auth();
  const legacy = await getLegacySession();
  const userId = nextAuth?.user?.id ?? legacy?.id ?? null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(0, Number(searchParams.get("page")) || 0);
  const cursor = searchParams.get("cursor") ?? undefined;

  const [deposits, trades, totalDeposits] = await Promise.all([
    prisma.deposit.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        method: true,
        asset: true,
        amount: true,
        status: true,
        txHash: true,
        createdAt: true,
      },
    }),
    prisma.trade.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      select: {
        id: true,
        marketId: true,
        side: true,
        shares: true,
        price: true,
        total: true,
        fee: true,
        createdAt: true,
        market: { select: { canonical: true, displayName: true } },
      },
    }),
    prisma.deposit.count({ where: { userId } }),
  ]);

  const depositItems = deposits.slice(0, PAGE_SIZE).map((d) => ({
    id: d.id,
    type: "deposit" as const,
    method: d.method,
    asset: d.asset,
    amount: d.amount,
    status: d.status,
    txHash: d.txHash,
    createdAt: d.createdAt,
  }));

  const tradeItems = trades.map((t) => ({
    id: t.id,
    type: "trade" as const,
    side: t.side,
    shares: t.shares,
    price: t.price,
    total: t.total,
    fee: t.fee,
    marketCanonical: t.market?.canonical,
    marketDisplayName: t.market?.displayName,
    createdAt: t.createdAt,
  }));

  const combined = [...depositItems, ...tradeItems].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const nextCursor = deposits.length > PAGE_SIZE ? deposits[PAGE_SIZE - 1]?.id : null;

  return NextResponse.json({
    transactions: combined.slice(0, PAGE_SIZE),
    nextCursor,
    totalDeposits,
  });
}
