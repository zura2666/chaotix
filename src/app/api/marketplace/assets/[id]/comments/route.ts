import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recordActivity } from "@/lib/activity-feed";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: assetId } = await params;
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { id: true },
  });
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  const comments = await prisma.assetComment.findMany({
    where: { assetId },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: { id: true, name: true, username: true },
      },
    },
  });
  return NextResponse.json({ comments });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: assetId } = await params;
  let body: { body?: string; parentId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const text = body.body?.trim();
  if (!text) return NextResponse.json({ error: "body required" }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "Comment too long" }, { status: 400 });

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: { id: true },
  });
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 });

  const comment = await prisma.$transaction(async (tx) => {
    const c = await tx.assetComment.create({
      data: {
        assetId,
        userId: user.id,
        body: text,
        parentId: body.parentId?.trim() || null,
      },
    });
    await tx.asset.update({
      where: { id: assetId },
      data: { commentCount: { increment: 1 } },
    });
    return c;
  });

  recordActivity(user.id, "asset_comment", {
    assetId,
    commentId: comment.id,
  }).catch(() => {});

  return NextResponse.json({
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt,
    user: { id: user.id, name: user.name, username: user.username },
  });
}
