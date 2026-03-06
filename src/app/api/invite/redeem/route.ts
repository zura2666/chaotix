import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { redeemInviteCode } from "@/lib/invite";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const code = typeof body.code === "string" ? body.code : "";
  const result = await redeemInviteCode(user.id, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const { recordActivity } = await import("@/lib/activity-feed");
  recordActivity(user.id, "referral_joined", {}).catch(() => {});
  return NextResponse.json({ success: true });
}
