import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { finalizeSeasonRanks } from "@/lib/competition";

/** POST: Finalize season ranks and award badges (admin only). Call when season ends. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  const user = await getSession();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { seasonId } = await params;
  try {
    await finalizeSeasonRanks(seasonId);
    return NextResponse.json({ ok: true, message: "Season finalized" });
  } catch (e) {
    console.error("[competition] finalize error:", e);
    return NextResponse.json({ error: "Failed to finalize season" }, { status: 500 });
  }
}
