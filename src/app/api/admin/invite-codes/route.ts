import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getSession();
  if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const codes = await prisma.inviteCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ codes });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: { code?: string; maxUses?: number; expiresAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const code = (body.code ?? "").trim().toUpperCase().replace(/\s+/g, "");
  if (!code) return NextResponse.json({ error: "Code required" }, { status: 400 });
  const existing = await prisma.inviteCode.findUnique({ where: { code } });
  if (existing) return NextResponse.json({ error: "Code already exists" }, { status: 400 });
  const maxUses = typeof body.maxUses === "number" ? body.maxUses : 1;
  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
  const created = await prisma.inviteCode.create({
    data: { code, maxUses, expiresAt },
  });
  return NextResponse.json({ code: created.code, id: created.id });
}
