import {
  getTopTraders,
  getTopReferrers,
  getTopTradersByProfit,
  getTopTradersByROI,
  getTopEarlyDiscoverers,
  getTopByReputation,
} from "@/lib/leaderboard";
import { LeaderboardView } from "./LeaderboardView";

export default async function LeaderboardPage() {
  const [traders, referrals, byProfit, byRoi, discoverers, byReputation] = await Promise.all([
    getTopTraders(20),
    getTopReferrers(20),
    getTopTradersByProfit(20),
    getTopTradersByROI(20),
    getTopEarlyDiscoverers(20),
    getTopByReputation(20),
  ]);
  return (
    <LeaderboardView
      traders={traders}
      referrals={referrals}
      byProfit={byProfit}
      byRoi={byRoi}
      discoverers={discoverers}
      byReputation={byReputation}
    />
  );
}
