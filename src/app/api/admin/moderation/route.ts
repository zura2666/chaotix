import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "pending";
  const queue = await prisma.moderationQueue.findMany({
    where: { status },
    include: { market: { select: { id: true, canonical: true, displayName: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ queue });
}

export async function PATCH(req: NextRequest) {
  const user = await getSession();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const { id, status: newStatus } = body as { id?: string; status?: string };
  if (!id || !newStatus) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }
  const allowed = ["approved", "removed", "reviewed"];
  if (!allowed.includes(newStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  await prisma.moderationQueue.update({
    where: { id },
    data: {
      status: newStatus,
      reviewedBy: user.id,
      reviewedAt: new Date(),
    },
  });
  if (newStatus === "removed") {
    const entry = await prisma.moderationQueue.findUnique({ where: { id }, select: { marketId: true } });
    if (entry) {
      await prisma.market.update({
        where: { id: entry.marketId },
        data: { status: "inactive", flaggedAt: new Date() },
      });
    }
  }
  return NextResponse.json({ ok: true });
}
