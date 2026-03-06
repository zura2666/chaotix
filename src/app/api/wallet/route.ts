import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-nextauth";
import { getSession as getLegacySession } from "@/lib/auth";
import { ensureUserBalance } from "@/lib/platform-balance";
import { prisma } from "@/lib/db";

export async function GET() {
  const nextAuth = await auth();
  const legacy = await getLegacySession();
  const userId = nextAuth?.user?.id ?? legacy?.id ?? null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { balance, lockedBalance } = await ensureUserBalance(userId);
  const available = Math.max(0, balance - lockedBalance);

  const depositAddresses = await prisma.depositAddress.findMany({
    where: { userId },
    select: { id: true, chain: true, address: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    balance,
    lockedBalance,
    available,
    depositAddresses,
  });
}
