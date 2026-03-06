import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-nextauth";
import { getSession as getLegacySession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rateLimit429 } from "@/lib/rate-limit";

const ALLOWED_CHAINS = ["ethereum", "polygon", "solana"];

/** Get or create a deposit address for the user on the given chain. */
export async function POST(req: NextRequest) {
  const nextAuth = await auth();
  const legacy = await getLegacySession();
  const userId = nextAuth?.user?.id ?? legacy?.id ?? null;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit429(`deposit_crypto:${userId}`, 30, 60 * 1000, "Too many requests.");
  if (rl) return rl;

  let body: { chain?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const chain = String(body.chain ?? "").toLowerCase();
  if (!ALLOWED_CHAINS.includes(chain)) {
    return NextResponse.json(
      { error: `Chain must be one of: ${ALLOWED_CHAINS.join(", ")}` },
      { status: 400 }
    );
  }

  let depositAddress = await prisma.depositAddress.findUnique({
    where: { userId_chain: { userId, chain } },
    select: { id: true, chain: true, address: true, createdAt: true },
  });

  if (!depositAddress) {
    const address = generateDepositAddress(userId, chain);
    depositAddress = await prisma.depositAddress.create({
      data: { userId, chain, address },
      select: { id: true, chain: true, address: true, createdAt: true },
    });
  }

  return NextResponse.json({
    chain: depositAddress.chain,
    address: depositAddress.address,
    message: "Send only supported assets to this address. Minimum deposit may apply.",
  });
}

function generateDepositAddress(userId: string, chain: string): string {
  const prefix = chain === "solana" ? "solana_" : "0x";
  const rnd = Buffer.from(userId + chain + Date.now().toString(36) + Math.random().toString(36))
    .toString("hex")
    .slice(0, chain === "solana" ? 32 : 40);
  return prefix + rnd;
}
