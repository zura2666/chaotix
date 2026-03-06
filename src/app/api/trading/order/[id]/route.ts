import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertCsrf } from "@/lib/csrf";
import { cancelOrder } from "@/lib/trading-orderbook";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrfError = assertCsrf(req);
  if (csrfError) return csrfError;
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const result = await cancelOrder({ orderId: id, userId: user.id });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}

