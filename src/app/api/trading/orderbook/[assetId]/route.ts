import { NextRequest, NextResponse } from "next/server";
import { getOrderBook } from "@/lib/trading-orderbook";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ assetId: string }> }
) {
  const { assetId } = await params;
  const orderBook = await getOrderBook(assetId);
  return NextResponse.json(orderBook);
}

