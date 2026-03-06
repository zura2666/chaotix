import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isAdmin: true },
  });
  if (!admin?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  let body: { status?: string; resolutionNote?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { status, resolutionNote } = body;
  const allowed = ["resolved_buyer", "resolved_seller", "dismissed"];
  if (!status || !allowed.includes(status)) {
    return NextResponse.json({ error: "status must be one of: " + allowed.join(", ") }, { status: 400 });
  }

  const dispute = await prisma.marketplaceDispute.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!dispute) return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
  if (dispute.status !== "open") return NextResponse.json({ error: "Dispute already resolved" }, { status: 400 });

  await prisma.marketplaceDispute.update({
    where: { id },
    data: {
      status,
      resolutionNote: resolutionNote?.trim().slice(0, 2000) ?? null,
      resolvedAt: new Date(),
      resolvedById: user.id,
    },
  });

  const { updateUserMarketplaceTrust } = await import("@/lib/marketplace-trust");
  const d = await prisma.marketplaceDispute.findUnique({
    where: { id },
    select: { trade: { select: { buyerId: true, sellerId: true } } },
  });
  if (d) {
    await Promise.all([
      updateUserMarketplaceTrust(d.trade.buyerId),
      updateUserMarketplaceTrust(d.trade.sellerId),
    ]);
  }
  return NextResponse.json({ ok: true });
}
