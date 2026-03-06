import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.userFollow.findMany({
    where: { followingId: user.id },
    include: { follower: { select: { id: true, name: true, email: true, username: true, referralCode: true } } },
  });
  return NextResponse.json({ followers: rows.map((r) => ({ user: r.follower, createdAt: r.createdAt })) });
}
