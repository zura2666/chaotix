import { NextResponse } from "next/server";
import { getCurrentSeason } from "@/lib/competition";

export async function GET() {
  const season = await getCurrentSeason();
  if (!season) {
    return NextResponse.json({ season: null });
  }
  return NextResponse.json({
    season: {
      id: season.id,
      name: season.name,
      slug: season.slug,
      description: season.description,
      startAt: season.startAt.toISOString(),
      endAt: season.endAt.toISOString(),
      topRankCount: season.topRankCount,
    },
  });
}
