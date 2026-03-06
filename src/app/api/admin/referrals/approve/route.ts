import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { userExistsByReferralCodeOrSlug, setUserReferralApproved } from "@/lib/user-referral-raw";

function generatePartnerCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const a = chars[Math.floor(Math.random() * chars.length)];
  const b = chars[Math.floor(Math.random() * chars.length)];
  const c = chars[Math.floor(Math.random() * chars.length)];
  const n = Math.floor(10 + Math.random() * 90);
  return `CHX-${a}${b}${c}-${n}`;
}

function slugFromCode(code: string): string {
  return code
    .replace(/^CHX-/, "")
    .replace(/-\d+$/, "")
    .toLowerCase();
}

export async function POST(req: NextRequest) {
  const admin = await getSession();
  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: { applicationId: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const app = await prisma.referralApplication.findUnique({
    where: { id: body.applicationId },
    include: { user: true },
  });
  if (!app || app.status !== "pending") {
    return NextResponse.json({ error: "Application not found or already reviewed" }, { status: 404 });
  }

  let partnerCode = generatePartnerCode();
  let slug = slugFromCode(partnerCode);
  while (await userExistsByReferralCodeOrSlug(partnerCode, slug)) {
    partnerCode = generatePartnerCode();
    slug = slugFromCode(partnerCode);
  }

  await prisma.$transaction([
    prisma.referralApplication.update({
      where: { id: app.id },
      data: { status: "approved", reviewedAt: new Date(), reviewedById: admin.id },
    }),
    setUserReferralApproved(app.userId, { referralCode: partnerCode, partnerShortSlug: slug }),
  ]);

  await createNotification({
    userId: app.userId,
    type: "referral_approved",
    title: "Your Referral Application has been approved!",
    body: "Start earning. Share your partner link from your profile.",
    link: "/profile",
  });

  return NextResponse.json({
    success: true,
    referralCode: partnerCode,
    shortLink: `/r/${slug}`,
  });
}
