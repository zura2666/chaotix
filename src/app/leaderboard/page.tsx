import {
  getTopTraders,
  getTopReferrers,
  getTopTradersByProfit,
  getTopTradersByROI,
  getTopEarlyDiscoverers,
  getTopByReputation,
  getTopNarrativeTraders,
  getTopMarketCreators,
} from "@/lib/leaderboard";
import { LeaderboardView } from "./LeaderboardView";

export default async function LeaderboardPage() {
  const [
    traders,
    referrals,
    byProfit,
    byRoi,
    discoverers,
    byReputation,
    narrativeTraders,
    marketCreators,
  ] = await Promise.all([
    getTopTraders(20),
    getTopReferrers(20),
    getTopTradersByProfit(20),
    getTopTradersByROI(20),
    getTopEarlyDiscoverers(20),
    getTopByReputation(20),
    getTopNarrativeTraders(20),
    getTopMarketCreators(20),
  ]);
  return (
    <LeaderboardView
      traders={traders}
      referrals={referrals}
      byProfit={byProfit}
      byRoi={byRoi}
      discoverers={discoverers}
      byReputation={byReputation}
      narrativeTraders={narrativeTraders}
      marketCreators={marketCreators}
    />
  );
}
