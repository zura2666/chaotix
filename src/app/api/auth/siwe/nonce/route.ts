import { NextResponse } from "next/server";
import { createNonce } from "@/lib/siwe";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const address = searchParams.get("address")?.trim();
  if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  }
  const nonce = createNonce(address);
  return NextResponse.json({ nonce });
}
