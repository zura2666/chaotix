import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const REASONS = ["illegal", "harassment", "spam"] as const;

/** Report a market for content moderation (adds to queue). */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ canonical: string }> }
) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { canonical } = await params;
  const decoded = decodeURIComponent(canonical);
  const market = await prisma.market.findUnique({
    where: { canonical: decoded },
    select: { id: true },
  });
  if (!market) {
    return NextResponse.json({ error: "Market not found" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const reason = body.reason as string | undefined;
  if (!reason || !REASONS.includes(reason as (typeof REASONS)[number])) {
    return NextResponse.json(
      { error: "reason required: illegal | harassment | spam" },
      { status: 400 }
    );
  }
  await prisma.moderationQueue.create({
    data: {
      marketId: market.id,
      reason,
      status: "pending",
      payload: JSON.stringify({ reportedBy: user.id }),
    },
  });
  return NextResponse.json({ ok: true });
}
