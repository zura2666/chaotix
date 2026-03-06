import { NextResponse } from "next/server";
import { getCreatorTrustInfo } from "@/lib/marketplace-trust";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const info = await getCreatorTrustInfo(userId);
  return NextResponse.json(info);
}
