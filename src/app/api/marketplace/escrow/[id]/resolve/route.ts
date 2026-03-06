import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { resolveEscrow } from "@/lib/marketplace";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: { resolution?: string };
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const resolution = body.resolution === "refund" ? "refund" : "release";

  const escrow = await prisma.marketplaceEscrow.findUnique({
    where: { id },
    select: { id: true, buyerId: true, sellerId: true, status: true },
  });
  if (!escrow) return NextResponse.json({ error: "Escrow not found" }, { status: 404 });
  if (escrow.status !== "held") return NextResponse.json({ error: "Escrow already resolved" }, { status: 400 });

  const isAdmin = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isAdmin: true },
  }).then((u) => u?.isAdmin ?? false);
  const isParty = user.id === escrow.buyerId || user.id === escrow.sellerId;
  if (!isAdmin && !isParty) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const result = await resolveEscrow(id, resolution, user.id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
