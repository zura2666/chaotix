import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  getTrendingByCategory,
  getNewestByCategory,
  getBiggestMoversByCategory,
  getHighestVolumeByCategory,
} from "@/lib/category-discovery";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, description: true },
  });
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }

  const [trending, newest, movers, topVolume] = await Promise.all([
    getTrendingByCategory(category.id, 10),
    getNewestByCategory(category.id, 10),
    getBiggestMoversByCategory(category.id, 10),
    getHighestVolumeByCategory(category.id, 10),
  ]);

  const toFeedItem = (m: { id: string; canonical: string; displayName: string; title: string | null; price: number; volume: number; tradeCount: number; tags: string; category?: { id: string; slug: string; name: string } | null; priceChange?: number; change?: number }) => ({
    id: m.id,
    canonical: m.canonical,
    displayName: m.displayName,
    title: m.title,
    price: m.price,
    volume: m.volume,
    tradeCount: m.tradeCount,
    tags: parseTags(m.tags),
    category: m.category,
    priceChange: m.priceChange ?? m.change,
  });

  return NextResponse.json({
    category,
    trending: trending.map(toFeedItem),
    newest: newest.map(toFeedItem),
    biggestMovers: movers.map(toFeedItem),
    topVolume: topVolume.map(toFeedItem),
  });
}

function parseTags(tagsJson: string): string[] {
  try {
    const t = JSON.parse(tagsJson);
    return Array.isArray(t) ? t : [];
  } catch {
    return [];
  }
}
