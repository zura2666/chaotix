import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { setUserReferralStatus } from "@/lib/user-referral-raw";

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
  });
  if (!app || app.status !== "pending") {
    return NextResponse.json({ error: "Application not found or already reviewed" }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.referralApplication.update({
      where: { id: app.id },
      data: { status: "rejected", reviewedAt: new Date(), reviewedById: admin.id },
    }),
    setUserReferralStatus(app.userId, "NONE"),
  ]);

  return NextResponse.json({ success: true });
}
