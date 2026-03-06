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

  const { id: targetUserId } = await params;
  let body: { verified?: boolean };
  try {
    body = await req.json().catch(() => ({}));
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: targetUserId },
    data: {
      marketplaceVerifiedAt: body.verified === true ? new Date() : null,
    },
  });

  const { updateUserMarketplaceTrust } = await import("@/lib/marketplace-trust");
  await updateUserMarketplaceTrust(targetUserId);
  return NextResponse.json({ ok: true });
}
