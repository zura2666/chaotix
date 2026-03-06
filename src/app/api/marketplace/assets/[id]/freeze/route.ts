import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(
  _req: Request,
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
  const asset = await prisma.asset.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  await prisma.asset.update({
    where: { id },
    data: { frozenAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
