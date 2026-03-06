import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ marketId: string }> }
) {
  const user = await getSession();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { marketId } = await params;
  const market = await prisma.market.findUnique({
    where: { id: marketId },
    select: { id: true, canonical: true, tradeCount: true },
  });
  if (!market) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
  }
  await prisma.market.delete({
    where: { id: marketId },
  });
  return NextResponse.json({ deleted: market.canonical });
}
