import { NextRequest, NextResponse } from "next/server";
import { getLiquidityIndicators } from "@/lib/marketplace";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const indicators = await getLiquidityIndicators(id);
  return NextResponse.json(indicators);
}
