import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTreasuryStats } from "@/lib/platform-token";

export async function GET() {
  const user = await getSession();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const stats = await getTreasuryStats();
  return NextResponse.json(stats);
}
