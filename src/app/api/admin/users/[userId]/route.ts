import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const user = await getSession();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { userId } = await params;
  const body = await req.json();
  if (body.isBanned != null) {
    await prisma.user.update({
      where: { id: userId },
      data: { isBanned: !!body.isBanned },
    });
  }
  if (body.isAdmin != null && user.id !== userId) {
    await prisma.user.update({
      where: { id: userId },
      data: { isAdmin: !!body.isAdmin },
    });
  }
  const updated = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isBanned: true, isAdmin: true },
  });
  return NextResponse.json({ user: updated });
}
