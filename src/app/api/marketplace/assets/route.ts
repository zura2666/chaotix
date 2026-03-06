import { NextRequest, NextResponse } from "next/server";
import { listAssets, searchAssets } from "@/lib/marketplace";

export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams;
  const category = u.get("category") ?? undefined;
  const limit = parseInt(u.get("limit") ?? "20", 10) || 20;
  const offset = parseInt(u.get("offset") ?? "0", 10) || 0;
  const q = u.get("q") ?? undefined;
  const sortBy = u.get("sortBy") ?? undefined;
  const minPrice = u.get("minPrice") ? parseFloat(u.get("minPrice")!) : undefined;
  const maxPrice = u.get("maxPrice") ? parseFloat(u.get("maxPrice")!) : undefined;
  const minVolume24h = u.get("minVolume24h") ? parseFloat(u.get("minVolume24h")!) : undefined;
  const minDemandScore = u.get("minDemandScore") ? parseFloat(u.get("minDemandScore")!) : undefined;
  const minLiquidityScore = u.get("minLiquidityScore") ? parseFloat(u.get("minLiquidityScore")!) : undefined;

  const hasFilters = q || sortBy || Number.isFinite(minPrice) || Number.isFinite(maxPrice) || Number.isFinite(minVolume24h) || Number.isFinite(minDemandScore) || Number.isFinite(minLiquidityScore);
  const assets = hasFilters
    ? await searchAssets({
        q,
        category,
        sortBy: sortBy as "trending" | "volume" | "demand" | "liquidity" | "price" | "newest",
        minPrice: Number.isFinite(minPrice) ? minPrice : undefined,
        maxPrice: Number.isFinite(maxPrice) ? maxPrice : undefined,
        minVolume24h: Number.isFinite(minVolume24h) ? minVolume24h : undefined,
        minDemandScore: Number.isFinite(minDemandScore) ? minDemandScore : undefined,
        minLiquidityScore: Number.isFinite(minLiquidityScore) ? minLiquidityScore : undefined,
        limit,
        offset,
      })
    : await listAssets({ category, limit, offset });
  return NextResponse.json({ assets });
}
