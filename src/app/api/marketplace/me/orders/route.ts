import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserOpenOrders } from "@/lib/marketplace";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const assetId = req.nextUrl.searchParams.get("assetId") ?? undefined;
  const { listings, bids } = await getUserOpenOrders(user.id, assetId);
  return NextResponse.json({ listings, bids });
}
