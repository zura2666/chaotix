import { NextRequest, NextResponse } from "next/server";
import { getSeasonRanks } from "@/lib/competition";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  const { seasonId } = await params;
  const limit = Math.min(200, Math.max(10, parseInt(_req.nextUrl.searchParams.get("limit") ?? "100", 10) || 100));
  const ranks = await getSeasonRanks(seasonId, limit);
  return NextResponse.json({ ranks });
}
