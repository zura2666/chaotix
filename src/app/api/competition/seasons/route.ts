import { NextResponse } from "next/server";
import { getSeasons } from "@/lib/competition";

export async function GET() {
  const seasons = await getSeasons(20);
  return NextResponse.json({
    seasons: seasons.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      description: s.description,
      startAt: s.startAt.toISOString(),
      endAt: s.endAt.toISOString(),
      topRankCount: s.topRankCount,
    })),
  });
}
