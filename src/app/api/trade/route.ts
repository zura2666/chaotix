import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { executeBuy, executeSell } from "@/lib/markets";
import { prisma } from "@/lib/db";
import { checkRateLimit, checkRateLimitAsync } from "@/lib/rate-limit";
import { TRADE_RATE_LIMIT_PER_MINUTE } from "@/lib/constants";
import { parseBody, tradeBodySchema } from "@/lib/api-schemas";
import { assertCsrf } from "@/lib/csrf";

async function ensureSettlementRecord(tradeId: string): Promise<void> {
  try {
    await prisma.tradeSettlement.upsert({
      where: { tradeId },
      create: { tradeId, status: "pending" },
      update: {},
    });
  } catch {
    // ignore
  }
}

export async function POST(req: NextRequest) {
  const csrfError = assertCsrf(req);
  if (csrfError) return csrfError;
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rateLimitKey = `trade:${user.id}`;
  const windowMs = 60 * 1000;
  const allowed = process.env.RATE_LIMIT_PROVIDER === "redis" || process.env.EVENT_BUS_PROVIDER === "redis"
    ? await checkRateLimitAsync(rateLimitKey, TRADE_RATE_LIMIT_PER_MINUTE, windowMs)
    : checkRateLimit(rateLimitKey, TRADE_RATE_LIMIT_PER_MINUTE, windowMs);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many trades. Please slow down." },
      { status: 429 }
    );
  }
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = parseBody(tradeBodySchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { action, marketId, amount, shares } = parsed.data;
    const market = await prisma.market.findUnique({
      where: { id: marketId },
    });
    if (!market) {
      return NextResponse.json({ error: "Market not found" }, { status: 404 });
    }
    const u = await prisma.user.findUnique({
      where: { id: user.id },
      select: { referredById: true },
    });
    const referrerId = u?.referredById ?? null;

    if (action === "buy") {
      const amt = amount ?? 0;
      if (!Number.isFinite(amt) || amt <= 0) {
        return NextResponse.json(
          { error: "Valid amount required" },
          { status: 400 }
        );
      }
      const result = await executeBuy({
        userId: user.id,
        marketId,
        amount: amt,
        referrerId,
      });
      if ("error" in result) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
      if (result.tradeId) ensureSettlementRecord(result.tradeId).catch(() => {});
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { balance: true },
      });
      return NextResponse.json({
        ...result,
        balance: updatedUser?.balance,
      });
    }

    if (action === "sell") {
      const sh = shares ?? 0;
      if (!Number.isFinite(sh) || sh <= 0) {
        return NextResponse.json(
          { error: "Valid shares required" },
          { status: 400 }
        );
      }
      const result = await executeSell({
        userId: user.id,
        marketId,
        shares: sh,
        referrerId,
      });
      if ("error" in result) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
      if (result.tradeId) ensureSettlementRecord(result.tradeId).catch(() => {});
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { balance: true },
      });
      return NextResponse.json({
        ...result,
        balance: updatedUser?.balance,
      });
    }

    return NextResponse.json(
      { error: "action must be 'buy' or 'sell'" },
      { status: 400 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
