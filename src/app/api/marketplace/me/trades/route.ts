import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserTradeHistory } from "@/lib/marketplace";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const assetId = req.nextUrl.searchParams.get("assetId") ?? undefined;
  const limit = parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10);
  const trades = await getUserTradeHistory(user.id, { assetId, limit });
  return NextResponse.json({ trades });
}
