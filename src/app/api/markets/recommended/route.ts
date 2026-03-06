import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getRecommendedMarkets } from "@/lib/recommendations";

export async function GET() {
  const user = await getSession();
  const markets = await getRecommendedMarkets(user?.id ?? null);
  return NextResponse.json({ recommended: markets });
}
