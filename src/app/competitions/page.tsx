import { getCurrentSeason, getSeasons } from "@/lib/competition";
import { CompetitionsView } from "./CompetitionsView";

export const metadata = {
  title: "Seasonal Trading Competitions · Chaotix",
  description: "Daily, weekly, and season leaderboards. Highest ROI, narrative discovery, and volume. Earn badges and permanent ranks.",
};

export default async function CompetitionsPage() {
  const [currentSeason, seasons] = await Promise.all([
    getCurrentSeason(),
    getSeasons(20),
  ]);
  const initialSeason = currentSeason
    ? {
        id: currentSeason.id,
        name: currentSeason.name,
        slug: currentSeason.slug,
        description: currentSeason.description,
        startAt: currentSeason.startAt.toISOString(),
        endAt: currentSeason.endAt.toISOString(),
        topRankCount: currentSeason.topRankCount,
      }
    : null;
  const initialSeasons = seasons.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    startAt: s.startAt.toISOString(),
    endAt: s.endAt.toISOString(),
    topRankCount: s.topRankCount,
  }));
  return (
    <CompetitionsView
      initialSeason={initialSeason}
      initialSeasons={initialSeasons}
    />
  );
}
