import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const creatorId = req.nextUrl.searchParams.get("creatorId");
  const limit = Math.min(50, parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10) || 20);

  const where = creatorId ? { creatorId } : {};
  const bundles = await prisma.assetBundle.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      creator: { select: { id: true, name: true, username: true } },
    },
  });
  return NextResponse.json({ bundles });
}

export async function POST(req: NextRequest) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { title?: string; description?: string; assetIds?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { title, description, assetIds } = body;
  if (!title?.trim()) return NextResponse.json({ error: "title required" }, { status: 400 });
  const ids = Array.isArray(assetIds) ? assetIds.filter(Boolean) : [];
  if (ids.length === 0) return NextResponse.json({ error: "assetIds required (array)" }, { status: 400 });

  const bundle = await prisma.assetBundle.create({
    data: {
      creatorId: user.id,
      title: title.trim(),
      description: description?.trim() ?? null,
      assetIds: JSON.stringify(ids),
    },
  });
  return NextResponse.json({ id: bundle.id });
}
