import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-nextauth";
import { getSession as getLegacySession } from "@/lib/auth";
import { getMarketByCanonical, findOrCreateMarket } from "@/lib/markets";
import { validateIdentifierSafe, validateDisplayNameSafe } from "@/lib/identifiers";
import { validateTags } from "@/lib/tags";
import { rateLimit429 } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { MIN_INITIAL_BUY_TO_ACTIVATE } from "@/lib/constants";
import { z } from "zod";

function parseTagsJson(tagsJson: string): string[] {
  try {
    const t = JSON.parse(tagsJson);
    return Array.isArray(t) ? t : [];
  } catch {
    return [];
  }
}

const createBodySchema = z.object({
  canonical: z.string().min(1).max(200),
  title: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  categoryId: z.string().cuid().optional(),
  tags: z.array(z.string().max(32)).max(5).optional(),
});

export async function POST(req: NextRequest) {
  const nextAuth = await auth();
  const legacy = await getLegacySession();
  const userId = nextAuth?.user?.id ?? legacy?.id ?? null;
  if (!userId) {
    return NextResponse.json({ error: "You must be logged in to create a market." }, { status: 401 });
  }

  const rl = await rateLimit429(`create_market:${userId}`, 10, 60 * 60 * 1000, "Too many markets created. Try again later.");
  if (rl) return rl;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    const err = parsed.error.flatten();
    const msg = Object.values(err.fieldErrors).flat().join(" ") || parsed.error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const { canonical: rawCanonical, title, description, categoryId, tags } = parsed.data;

  const canonicalResult = validateIdentifierSafe(rawCanonical.trim());
  if (!canonicalResult.ok) {
    return NextResponse.json({ error: canonicalResult.error }, { status: 400 });
  }
  const canonical = canonicalResult.value;

  if (categoryId) {
    const cat = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat) {
      return NextResponse.json({ error: "Category does not exist." }, { status: 400 });
    }
  }

  const tagsResult = validateTags(tags ?? []);
  if (!tagsResult.ok) {
    return NextResponse.json({ error: tagsResult.error }, { status: 400 });
  }
  const validatedTags = tagsResult.value;

  const existing = await getMarketByCanonical(canonical);
  if (existing) {
    return NextResponse.json(
      { error: "A market with this canonical string already exists.", canonical: existing.canonical },
      { status: 409 }
    );
  }

  let displayTitle: string | undefined;
  if (title !== undefined && title.trim()) {
    const t = validateDisplayNameSafe(title.trim());
    if (t.ok) displayTitle = t.value; else return NextResponse.json({ error: t.error }, { status: 400 });
  }
  const displayDescription =
    description !== undefined && description.trim()
      ? String(description).replace(/[\x00-\x1f\x7f]/g, "").trim().slice(0, 2000)
      : undefined;

  const result = await findOrCreateMarket(canonical, userId, {
    title: displayTitle,
    description: displayDescription,
    categoryId: categoryId ?? undefined,
    tags: validatedTags,
  });

  if ("error" in result && result.error) {
    const err = result.error;
    const status = err.includes("limit") || err.includes("Rate limit") ? 429 : 400;
    return NextResponse.json({ error: err }, { status });
  }

  const market = result.market;
  if (!market) return NextResponse.json({ error: "Failed to create market." }, { status: 500 });

  return NextResponse.json({
    market: {
      id: market.id,
      canonical: market.canonical,
      displayName: market.displayName,
    },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const categorySlug = searchParams.get("category")?.trim();
  const tag = searchParams.get("tag")?.trim().toLowerCase();
  const limit = Math.min(Number(searchParams.get("limit")) || 30, 50);

  const where: {
    categoryId?: string;
    category?: { slug: string };
    tags?: { contains: string };
    tradeCount: { gt: number };
    volume: { gte: number };
  } = {
    tradeCount: { gt: 0 },
    volume: { gte: MIN_INITIAL_BUY_TO_ACTIVATE },
  };

  if (categorySlug) where.category = { slug: categorySlug };
  if (tag) where.tags = { contains: `"${tag}"` };

  const markets = await prisma.market.findMany({
    where,
    include: { category: { select: { id: true, slug: true, name: true } } },
    orderBy: { volume: "desc" },
    take: limit,
  });

  const items = markets.map((m) => ({
    id: m.id,
    canonical: m.canonical,
    displayName: m.displayName,
    title: m.title,
    description: m.description,
    price: m.price,
    volume: m.volume,
    volume24h: m.volume24h,
    priceChange24h: m.priceChange24h,
    tradeCount: m.tradeCount,
    tags: parseTagsJson(m.tags),
    category: m.category,
    createdAt: m.createdAt,
  }));

  return NextResponse.json({ markets: items });
}
