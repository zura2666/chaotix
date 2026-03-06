import { NextRequest, NextResponse } from "next/server";
import { searchAssets } from "@/lib/marketplace";

/**
 * Search and filter marketplace assets.
 * Query params: q, category, sortBy, minPrice, maxPrice, minVolume24h, minDemandScore, minLiquidityScore, limit, offset
 */
export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams;
  const q = u.get("q") ?? undefined;
  const category = u.get("category") ?? undefined;
  const sortBy = (u.get("sortBy") as "trending" | "volume" | "demand" | "liquidity" | "price" | "newest") ?? undefined;
  const minPrice = u.get("minPrice") ? parseFloat(u.get("minPrice")!) : undefined;
  const maxPrice = u.get("maxPrice") ? parseFloat(u.get("maxPrice")!) : undefined;
  const minVolume24h = u.get("minVolume24h") ? parseFloat(u.get("minVolume24h")!) : undefined;
  const minDemandScore = u.get("minDemandScore") ? parseFloat(u.get("minDemandScore")!) : undefined;
  const minLiquidityScore = u.get("minLiquidityScore") ? parseFloat(u.get("minLiquidityScore")!) : undefined;
  const limit = Math.min(100, parseInt(u.get("limit") ?? "20", 10) || 20);
  const offset = parseInt(u.get("offset") ?? "0", 10) || 0;

  const assets = await searchAssets({
    q,
    category,
    sortBy,
    minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
    maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
    minVolume24h: Number.isFinite(minVolume24h) ? minVolume24h : undefined,
    minDemandScore: Number.isFinite(minDemandScore) ? minDemandScore : undefined,
    minLiquidityScore: Number.isFinite(minLiquidityScore) ? minLiquidityScore : undefined,
    limit,
    offset,
  });
  return NextResponse.json({ assets });
}
