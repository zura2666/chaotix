import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const REASONS = ["liquidity_incentive", "creator_program", "growth_campaign", "other"] as const;

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);
  const reason = body.reason ?? "other";
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Valid amount required" }, { status: 400 });
  }
  if (!REASONS.includes(reason as (typeof REASONS)[number])) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }
  const transfer = await prisma.treasuryTransfer.create({
    data: { amount, reason },
  });
  return NextResponse.json({ transfer });
}

export async function GET() {
  const user = await getSession();
  if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const transfers = await prisma.treasuryTransfer.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ transfers });
}
