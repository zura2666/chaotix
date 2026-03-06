import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-nextauth";
import { getSession as getLegacySession } from "@/lib/auth";
import { getMarketByCanonical, findOrCreateMarket } from "@/lib/markets";
import { validateIdentifierSafe, validateDisplayNameSafe } from "@/lib/identifiers";
import { validateTags } from "@/lib/tags";
import { rateLimit429 } from "@/lib/rate-limit";
import { prisma } from "@/lib/db";
import { MIN_INITIAL_BUY_TO_ACTIVATE, CURATED_NARRATIVE_MODE } from "@/lib/constants";
import { resolveCanonicalOrNormalize, canCreateDirect } from "@/lib/governance";
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

  const resolved = await resolveCanonicalOrNormalize(rawCanonical.trim());
  if (resolved.error) {
    return NextResponse.json({ error: resolved.error }, { status: 400 });
  }
  const canonical = resolved.canonical;

  const existing = await getMarketByCanonical(canonical);
  if (existing) {
    return NextResponse.json(
      { error: "This narrative already exists.", canonical: existing.canonical, useProposal: true },
      { status: 409 }
    );
  }

  if (CURATED_NARRATIVE_MODE) {
    const adminUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true },
    });
    if (!adminUser?.isAdmin) {
      return NextResponse.json(
        { error: "Only admins can create markets. The platform uses a curated set of narrative markets." },
        { status: 403 }
      );
    }
  } else {
    const userForGov = await prisma.user.findUnique({
      where: { id: userId },
      select: { reputationScore: true },
    });
    if (!canCreateDirect(userForGov ?? {})) {
      return NextResponse.json(
        {
          error: "Minimum reputation required to create markets directly. Propose a market instead and get community upvotes.",
          useProposal: true,
        },
        { status: 403 }
      );
    }
  }

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
    isCoreMarket: CURATED_NARRATIVE_MODE, // admin-created in curated mode = core
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
