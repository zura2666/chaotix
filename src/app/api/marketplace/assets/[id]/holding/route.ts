import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserHolding } from "@/lib/marketplace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: assetId } = await params;
  const quantity = await getUserHolding(user.id, assetId);
  return NextResponse.json({ quantity });
}
