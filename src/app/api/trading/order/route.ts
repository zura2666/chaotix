import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { createOrder } from "@/lib/trading-orderbook";

export async function POST(req: NextRequest) {
  const csrfError = assertCsrf(req);
  if (csrfError) return csrfError;
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    assetId?: string;
    type?: "buy" | "sell";
    orderType?: "limit" | "market";
    price?: number;
    quantity?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const assetId = body.assetId?.trim();
  const type = body.type;
  const orderType = body.orderType;
  const quantity = Number(body.quantity);
  const price = body.price == null ? undefined : Number(body.price);

  if (!assetId) return NextResponse.json({ error: "assetId required" }, { status: 400 });
  if (type !== "buy" && type !== "sell") return NextResponse.json({ error: "type must be buy|sell" }, { status: 400 });
  if (orderType !== "limit" && orderType !== "market") return NextResponse.json({ error: "orderType must be limit|market" }, { status: 400 });
  if (!Number.isFinite(quantity) || quantity <= 0) return NextResponse.json({ error: "quantity must be positive" }, { status: 400 });
  if (orderType === "limit" && (!Number.isFinite(price) || (price as number) <= 0)) {
    return NextResponse.json({ error: "price required for limit order" }, { status: 400 });
  }

  const result = await createOrder({
    userId: user.id,
    assetId,
    type,
    orderType,
    price,
    quantity,
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}

