import { NextRequest, NextResponse } from "next/server";
import { updateAllDemandAndTrending } from "@/lib/marketplace-demand";

/** POST /api/marketplace/cron/rankings — recompute demand & trending for all assets. Call every few minutes. */
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET ?? process.env.MARKETPLACE_CRON_SECRET;
  if (cronSecret && auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await updateAllDemandAndTrending();
  return NextResponse.json(result);
}
