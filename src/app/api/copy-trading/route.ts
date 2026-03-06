import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBody, copyTradingBodySchema } from "@/lib/api-schemas";
import { assertCsrf } from "@/lib/csrf";
import { rateLimit429 } from "@/lib/rate-limit";
import { FOLLOW_COPY_TRADE_RATE_LIMIT_PER_MINUTE } from "@/lib/constants";

const WINDOW_MS = 60 * 1000;

export async function POST(req: NextRequest) {
  const csrfError = assertCsrf(req);
  if (csrfError) return csrfError;
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit429(`copy:${user.id}`, FOLLOW_COPY_TRADE_RATE_LIMIT_PER_MINUTE, WINDOW_MS);
  if (rl) return rl;
  const body = await req.json().catch(() => ({}));
  const parsed = parseBody(copyTradingBodySchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const traderId = parsed.data.traderId ?? parsed.data.userId;
  const allocation = parsed.data.allocation;
  if (!traderId || traderId === user.id) {
    return NextResponse.json({ error: "Invalid trader" }, { status: 400 });
  }
  const trader = await prisma.user.findUnique({ where: { id: traderId }, select: { id: true } });
  if (!trader) return NextResponse.json({ error: "Trader not found" }, { status: 404 });
  await prisma.copyTrading.upsert({
    where: { followerId_traderId: { followerId: user.id, traderId: trader.id } },
    create: { followerId: user.id, traderId: trader.id, allocation },
    update: { allocation },
  });
  return NextResponse.json({ ok: true, traderId: trader.id, allocation });
}

export async function DELETE(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const traderId = req.nextUrl.searchParams.get("traderId") ?? req.nextUrl.searchParams.get("userId");
  if (!traderId) return NextResponse.json({ error: "traderId required" }, { status: 400 });
  await prisma.copyTrading.deleteMany({
    where: { followerId: user.id, traderId },
  });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const list = await prisma.copyTrading.findMany({
    where: { followerId: user.id },
    include: { trader: { select: { id: true, name: true, username: true, referralCode: true } } },
  });
  return NextResponse.json({ copyTrading: list.map((r) => ({ trader: r.trader, allocation: r.allocation })) });
}
