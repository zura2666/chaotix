import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const SUPPORTED_CHAINS = ["ethereum", "solana"] as const;

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const { walletAddress, chain } = body as { walletAddress?: string; chain?: string };
    const address = typeof walletAddress === "string" ? walletAddress.trim() : "";
    const chainLower = typeof chain === "string" ? chain.toLowerCase() : "";
    if (!address || address.length < 20) {
      return NextResponse.json(
        { error: "Valid walletAddress required" },
        { status: 400 }
      );
    }
    if (!SUPPORTED_CHAINS.includes(chainLower as (typeof SUPPORTED_CHAINS)[number])) {
      return NextResponse.json(
        { error: "Unsupported chain. Use ethereum or solana." },
        { status: 400 }
      );
    }
    const existing = await prisma.walletAccount.findUnique({
      where: {
        chain_walletAddress: { chain: chainLower, walletAddress: address },
      },
    });
    if (existing) {
      if (existing.userId !== user.id) {
        return NextResponse.json(
          { error: "Wallet already linked to another account" },
          { status: 409 }
        );
      }
      return NextResponse.json({
        ok: true,
        wallet: {
          id: existing.id,
          walletAddress: existing.walletAddress,
          chain: existing.chain,
          verifiedAt: existing.verifiedAt,
        },
      });
    }
    const wallet = await prisma.walletAccount.create({
      data: {
        userId: user.id,
        walletAddress: address,
        chain: chainLower,
      },
    });
    return NextResponse.json({
      ok: true,
      wallet: {
        id: wallet.id,
        walletAddress: wallet.walletAddress,
        chain: wallet.chain,
        verifiedAt: wallet.verifiedAt,
      },
    });
  } catch (e) {
    console.error("Wallet connect error", e);
    return NextResponse.json(
      { error: "Failed to connect wallet" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const accounts = await prisma.walletAccount.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      walletAddress: true,
      chain: true,
      verifiedAt: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ wallets: accounts });
}
