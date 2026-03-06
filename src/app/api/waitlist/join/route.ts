import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { joinWaitlist } from "@/lib/invite";

export async function POST() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await joinWaitlist(user.id);
  return NextResponse.json({ success: true });
}
