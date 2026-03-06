import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPortfolio } from "@/lib/marketplace";

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const portfolio = await getPortfolio(user.id);
  return NextResponse.json({ portfolio });
}
