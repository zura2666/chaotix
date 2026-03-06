import { NextRequest, NextResponse } from "next/server";
import { getOrderBook } from "@/lib/trading-orderbook";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const orderBook = await getOrderBook(id);
  return NextResponse.json(orderBook);
}
