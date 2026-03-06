import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getWaitlistConversionStats } from "@/lib/invite";
import { getBetaAnalytics } from "@/lib/beta-analytics";

export async function GET() {
  const user = await getSession();
  if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const [waitlist, analytics] = await Promise.all([
    getWaitlistConversionStats(),
    getBetaAnalytics(),
  ]);
  return NextResponse.json({ waitlist, analytics });
}
