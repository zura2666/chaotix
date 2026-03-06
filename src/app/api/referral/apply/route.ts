import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { setUserReferralPending } from "@/lib/user-referral-raw";

const PITCH_MAX_LENGTH = 500;

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (user.referralStatus === "APPROVED") {
    return NextResponse.json(
      { error: "You are already an approved partner." },
      { status: 400 }
    );
  }
  if (user.referralStatus === "PENDING") {
    return NextResponse.json(
      { error: "You already have a pending application." },
      { status: 400 }
    );
  }

  let body: {
    twitterHandle?: string;
    discordHandle?: string;
    telegramHandle?: string;
    pitch?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const twitterHandle = typeof body.twitterHandle === "string" ? body.twitterHandle.trim() || null : null;
  const discordHandle = typeof body.discordHandle === "string" ? body.discordHandle.trim() || null : null;
  const telegramHandle = typeof body.telegramHandle === "string" ? body.telegramHandle.trim() || null : null;
  const pitch = typeof body.pitch === "string" ? body.pitch.trim().slice(0, PITCH_MAX_LENGTH) || null : null;

  if (!twitterHandle && !discordHandle && !telegramHandle) {
    return NextResponse.json(
      { error: "Provide at least one social handle (Twitter, Discord, or Telegram)." },
      { status: 400 }
    );
  }
  if (!pitch || pitch.length < 20) {
    return NextResponse.json(
      { error: "Pitch must be at least 20 characters (max 500)." },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.referralApplication.create({
      data: {
        userId: user.id,
        twitterHandle,
        discordHandle,
        telegramHandle,
        pitch,
        status: "pending",
      },
    }),
    setUserReferralPending(user.id, {
      twitterHandle,
      discordHandle,
      telegramHandle,
      referralPitch: pitch,
    }),
  ]);

  return NextResponse.json({
    success: true,
    message: "Application submitted. We'll review it shortly.",
  });
}
