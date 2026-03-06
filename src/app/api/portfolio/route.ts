import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPortfolio } from "@/lib/portfolio";
import { rateLimit429 } from "@/lib/rate-limit";
import { PORTFOLIO_FEED_RATE_LIMIT_PER_MINUTE } from "@/lib/constants";

const WINDOW_MS = 60 * 1000;

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rl = await rateLimit429(`portfolio:${user.id}`, PORTFOLIO_FEED_RATE_LIMIT_PER_MINUTE, WINDOW_MS);
  if (rl) return rl;
  const portfolio = await getPortfolio(user.id);
  return NextResponse.json(portfolio);
}
