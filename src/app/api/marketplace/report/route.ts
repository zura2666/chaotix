import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { resourceType?: string; resourceId?: string; reason?: string; details?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { resourceType, resourceId, reason, details } = body;
  if (resourceType !== "asset" && resourceType !== "user") {
    return NextResponse.json({ error: "resourceType must be 'asset' or 'user'" }, { status: 400 });
  }
  if (!resourceId?.trim()) return NextResponse.json({ error: "resourceId required" }, { status: 400 });
  if (!reason?.trim()) return NextResponse.json({ error: "reason required" }, { status: 400 });

  if (resourceType === "asset") {
    const asset = await prisma.asset.findUnique({ where: { id: resourceId }, select: { id: true } });
    if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  } else {
    const target = await prisma.user.findUnique({ where: { id: resourceId }, select: { id: true } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const report = await prisma.marketplaceReport.create({
    data: {
      reporterId: user.id,
      resourceType,
      resourceId: resourceId.trim(),
      reason: reason.trim().slice(0, 200),
      details: details?.trim().slice(0, 1000) ?? null,
      status: "pending",
    },
  });
  return NextResponse.json({ id: report.id });
}
