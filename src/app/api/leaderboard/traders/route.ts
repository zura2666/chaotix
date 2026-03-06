import { NextRequest, NextResponse } from "next/server";
import {
  getTopTraders,
  getTopTradersByProfit,
  getTopTradersByROI,
  getTopEarlyDiscoverers,
  getTopByReputation,
} from "@/lib/leaderboard";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "volume";
  const limit = Math.min(50, Math.max(5, parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10) || 20));

  if (type === "profit") {
    const list = await getTopTradersByProfit(limit);
    return NextResponse.json({ leaderboard: list, type: "profit" });
  }
  if (type === "roi") {
    const list = await getTopTradersByROI(limit);
    return NextResponse.json({ leaderboard: list, type: "roi" });
  }
  if (type === "discovery") {
    const list = await getTopEarlyDiscoverers(limit);
    return NextResponse.json({ leaderboard: list, type: "discovery" });
  }
  if (type === "reputation") {
    const list = await getTopByReputation(limit);
    return NextResponse.json({ leaderboard: list, type: "reputation" });
  }
  const list = await getTopTraders(limit);
  return NextResponse.json({ leaderboard: list, type: "volume" });
}
