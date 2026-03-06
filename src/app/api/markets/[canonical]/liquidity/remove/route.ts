import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMarketByCanonical } from "@/lib/markets";
import { removeLiquidity, getMarketLpSummary } from "@/lib/liquidity";
import { parseBody, liquidityRemoveBodySchema } from "@/lib/api-schemas";
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
  const rl = await rateLimit429(`lp_remove:${user.id}`, LIQUIDITY_RATE_LIMIT_PER_MINUTE, WINDOW_MS);
  if (rl) return rl;

  const { canonical } = await params;
  const market = await getMarketByCanonical(decodeURIComponent(canonical));
  if (!market) return NextResponse.json({ error: "Market not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = parseBody(liquidityRemoveBodySchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { lpTokens } = parsed.data;

  const result = await removeLiquidity({
    userId: user.id,
    marketId: market.id,
    lpTokensToBurn: lpTokens,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const summary = await getMarketLpSummary(market.id);
  return NextResponse.json({
    ...result,
    summary: summary ?? undefined,
  });
}
