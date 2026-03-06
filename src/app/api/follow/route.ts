import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseBody, followBodySchema } from "@/lib/api-schemas";
import { assertCsrf } from "@/lib/csrf";
import { rateLimit429 } from "@/lib/rate-limit";
import { FOLLOW_COPY_TRADE_RATE_LIMIT_PER_MINUTE } from "@/lib/constants";

const WINDOW_MS = 60 * 1000;

export async function POST(req: NextRequest) {
  const csrfError = assertCsrf(req);
  if (csrfError) return csrfError;
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rl = await rateLimit429(`follow:${user.id}`, FOLLOW_COPY_TRADE_RATE_LIMIT_PER_MINUTE, WINDOW_MS);
  if (rl) return rl;
  const body = await req.json().catch(() => ({}));
  const parsed = parseBody(followBodySchema, { ...body, userId: body.userId ?? req.nextUrl.searchParams.get("userId"), followingId: body.followingId });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const followingId = parsed.data.userId ?? parsed.data.followingId;
  if (!followingId || followingId === user.id) {
    return NextResponse.json({ error: "Invalid user to follow" }, { status: 400 });
  }
  const target = await prisma.user.findUnique({ where: { id: followingId }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  await prisma.userFollow.upsert({
    where: { followerId_followingId: { followerId: user.id, followingId: target.id } },
    create: { followerId: user.id, followingId: target.id },
    update: {},
  });
  return NextResponse.json({ ok: true, followingId: target.id });
}

export async function DELETE(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const followingId = req.nextUrl.searchParams.get("userId") ?? req.nextUrl.searchParams.get("followingId");
  if (!followingId) return NextResponse.json({ error: "userId required" }, { status: 400 });
  await prisma.userFollow.deleteMany({
    where: { followerId: user.id, followingId },
  });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const type = req.nextUrl.searchParams.get("type") ?? "following";
  if (type === "followers") {
    const rows = await prisma.userFollow.findMany({
      where: { followingId: user.id },
      include: { follower: { select: { id: true, name: true, email: true, username: true, referralCode: true } } },
    });
    return NextResponse.json({ followers: rows.map((r) => ({ user: r.follower, createdAt: r.createdAt })) });
  }
  const rows = await prisma.userFollow.findMany({
    where: { followerId: user.id },
    include: { following: { select: { id: true, name: true, email: true, username: true, referralCode: true } } },
  });
  return NextResponse.json({ following: rows.map((r) => ({ user: r.following, createdAt: r.createdAt })) });
}
