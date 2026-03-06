import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMarketByCanonical } from "@/lib/markets";
import { addLiquidity, getMarketLpSummary } from "@/lib/liquidity";
import { parseBody, liquidityAddBodySchema } from "@/lib/api-schemas";
import { assertCsrf } from "@/lib/csrf";
import { rateLimit429 } from "@/lib/rate-limit";
import { LIQUIDITY_RATE_LIMIT_PER_MINUTE } from "@/lib/constants";

const WINDOW_MS = 60 * 1000;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ canonical: string }> }
) {
  const csrfError = assertCsrf(req);
  if (csrfError) return csrfError;
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit429(`lp_add:${user.id}`, LIQUIDITY_RATE_LIMIT_PER_MINUTE, WINDOW_MS);
  if (rl) return rl;

  const { canonical } = await params;
  const decoded = decodeURIComponent(canonical);
  const market = await getMarketByCanonical(decoded);
  if (!market) return NextResponse.json({ error: "Market not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = parseBody(liquidityAddBodySchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { amount } = parsed.data;

  const result = await addLiquidity({
    userId: user.id,
    marketId: market.id,
    tokensIn: amount,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const { recordActivity } = await import("@/lib/activity-feed");
  recordActivity(user.id, "liquidity_added", { marketId: market.id, amount }).catch(() => {});

  const summary = await getMarketLpSummary(market.id);
  return NextResponse.json({
    ...result,
    summary: summary ?? undefined,
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ canonical: string }> }
) {
  const { canonical } = await params;
  const market = await getMarketByCanonical(decodeURIComponent(canonical));
  if (!market) return NextResponse.json({ error: "Market not found" }, { status: 404 });
  const summary = await getMarketLpSummary(market.id);
  return NextResponse.json(summary ?? {});
}
