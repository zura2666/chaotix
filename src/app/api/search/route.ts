import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeForLookup } from "@/lib/identifiers";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ markets: [] });
  }
  const term = normalizeForLookup(q);
  const byCanonical = prisma.market.findMany({
    where: {
      OR: [
        { canonical: { contains: term } },
        { displayName: { contains: term } },
      ],
    },
    take: 20,
    select: { id: true },
  });
  const byAlias = prisma.marketAlias
    .findMany({
      where: {
        OR: [
          { alias: { contains: term } },
          { normalized: { contains: term } },
        ],
      },
      select: { canonical: true },
    })
    .then((rows) =>
      rows.length === 0
        ? []
        : prisma.market.findMany({
            where: { canonical: { in: rows.map((r) => r.canonical) } },
            select: { id: true },
          })
    );
  const byCreator = (async () => {
    const users = await prisma.user.findMany({
      where: { marketsCreated: { gt: 0 } },
      select: { id: true, name: true },
    });
    const match = users.filter((u) => u.name?.toLowerCase().includes(term));
    if (match.length === 0) return [];
    return prisma.market.findMany({
      where: { createdById: { in: match.map((u) => u.id) } },
      select: { id: true },
    });
  })();
  const byTags = prisma.market.findMany({
    where: { tags: { contains: term } },
    take: 20,
    select: { id: true },
  });

  const byCategories = prisma.category.findMany({
    where: {
      OR: [
        { slug: { contains: term } },
        { name: { contains: term } },
      ],
    },
    take: 10,
    select: { id: true, slug: true, name: true },
  });

  const [canonicalIds, aliasIds, creatorIds, tagIds, categories] = await Promise.all([
    byCanonical,
    byAlias,
    byCreator,
    byTags,
    byCategories,
  ]);

  const idSet = new Set<string>();
  for (const m of [...canonicalIds, ...aliasIds, ...creatorIds, ...tagIds]) {
    idSet.add(m.id);
  }

  const [markets, tagCandidates] = await Promise.all([
    idSet.size > 0
      ? prisma.market.findMany({
          where: { id: { in: Array.from(idSet) } },
          include: { category: { select: { id: true, slug: true, name: true } } },
          orderBy: [{ tradeCount: "desc" }, { volume: "desc" }],
          take: 25,
        })
      : [],
    prisma.market.findMany({
      where: { tags: { contains: term } },
      select: { tags: true },
      take: 50,
    }),
  ]);

  const tagSet = new Set<string>();
  const termLower = term.toLowerCase();
  for (const m of tagCandidates) {
    try {
      const arr = JSON.parse(m.tags);
      if (Array.isArray(arr))
        arr.forEach((t: string) => {
          if (String(t).toLowerCase().includes(termLower)) tagSet.add(String(t));
        });
    } catch {
      // ignore
    }
  }
  const tags = Array.from(tagSet).slice(0, 10);

  return NextResponse.json({
    markets,
    categories,
    tags,
  });
}
