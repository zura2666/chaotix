import { NextRequest, NextResponse } from "next/server";
import {
  getTrendingAssets,
  getRisingAssets,
  getMostTradedAssets,
  getHighestVolumeAssets,
  getNewlyPopularAssets,
} from "@/lib/marketplace-demand";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const LIMIT = 20;

/** GET /api/marketplace/rankings?sort=trending|rising|volume|trades|new */
export async function GET(req: NextRequest) {
  const sort = req.nextUrl.searchParams.get("sort") ?? "trending";
  const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get("limit") ?? String(LIMIT), 10) || LIMIT);

  let list: unknown[];
  switch (sort) {
    case "trending":
      list = await getTrendingAssets(limit);
      break;
    case "rising":
      list = await getRisingAssets(limit);
      break;
    case "trades":
      list = await getMostTradedAssets(limit);
      break;
    case "volume":
      list = await getHighestVolumeAssets(limit);
      break;
    case "new":
      list = await getNewlyPopularAssets(limit);
      break;
    default:
      list = await getTrendingAssets(limit);
  }

  const response = NextResponse.json({ sort, assets: list });
  response.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=180");
  return response;
}
