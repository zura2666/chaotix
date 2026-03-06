import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * Wallet signature verification (structure only).
 * In production: verify signed message matches walletAddress and chain.
 */
export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { walletAccountId, signature, message } = body as {
      walletAccountId?: string;
      signature?: string;
      message?: string;
    };
    if (!walletAccountId) {
      return NextResponse.json(
        { error: "walletAccountId required" },
        { status: 400 }
      );
    }
    const account = await prisma.walletAccount.findFirst({
      where: { id: walletAccountId, userId: user.id },
    });
    if (!account) {
      return NextResponse.json(
        { error: "Wallet account not found" },
        { status: 404 }
      );
    }
    // Placeholder: in production, verify signature against account.walletAddress and message
    const _ = { signature, message };
    const verifiedAt = new Date();
    await prisma.walletAccount.update({
      where: { id: account.id },
      data: { verifiedAt },
    });
    return NextResponse.json({
      ok: true,
      verifiedAt: verifiedAt.toISOString(),
      wallet: {
        id: account.id,
        walletAddress: account.walletAddress,
        chain: account.chain,
        verifiedAt,
      },
    });
  } catch (e) {
    console.error("Wallet verify error", e);
    return NextResponse.json(
      { error: "Failed to verify wallet" },
      { status: 500 }
    );
  }
}
