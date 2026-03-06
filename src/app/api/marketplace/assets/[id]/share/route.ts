import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: assetId } = await params;
  let body: { listingId?: string };
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { id: true },
  });
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  await prisma.$transaction(async (tx) => {
    await tx.assetShare.create({
      data: {
        assetId,
        userId: user.id,
        listingId: body.listingId?.trim() || null,
      },
    });
    await tx.asset.update({
      where: { id: assetId },
      data: { shareCount: { increment: 1 } },
    });
  });

  return NextResponse.json({ ok: true });
}
