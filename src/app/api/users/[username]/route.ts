import { NextRequest, NextResponse } from "next/server";
import { getProfileByUsername, getProfileWithStats } from "@/lib/user-profile";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 });
  const withStats = req.nextUrl.searchParams.get("stats") === "1" || req.nextUrl.searchParams.get("stats") === "true";
  const base = await getProfileByUsername(username);
  if (!base) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const profile = withStats ? await getProfileWithStats(base.id) : base;
  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const publicProfile = { ...profile };
  if ("email" in publicProfile && publicProfile.email) {
    (publicProfile as { email?: string }).email = undefined;
  }
  return NextResponse.json(publicProfile);
}
