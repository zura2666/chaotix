import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const INITIAL_RESERVE_TOKENS = 10_000;
const INITIAL_RESERVE_SHARES = 10_000;
const INITIAL_PRICE = INITIAL_RESERVE_TOKENS / INITIAL_RESERVE_SHARES;

function toDisplayName(canonical) {
  return canonical
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Curated global narrative markets (core markets). Only these + high-volume appear in discovery when CURATED_NARRATIVE_MODE. */
const CORE_NARRATIVE_CANONICALS = [
  "ai",
  "nvidia",
  "openai",
  "elon-musk",
  "tesla",
  "bitcoin",
  "ethereum",
  "china",
  "united-states",
  "world-war-3",
  "israel-iran",
  "climate-change",
  "apple",
  "microsoft",
  "spacex",
  "google",
  "meta",
  "donald-trump",
  "europe",
  "india",
  "quantum-computing",
  "agi",
  "robotics",
  "semiconductors",
  "defense",
  "oil",
  "renewable-energy",
  "global-economy",
  "inflation",
  "recession",
];

const DEFAULT_CATEGORIES = [
  { slug: "politics", name: "Politics", description: "Elections, policy, and political events" },
  { slug: "economics", name: "Economics", description: "Markets, macro, and economic indicators" },
  { slug: "crypto", name: "Crypto", description: "Cryptocurrency and blockchain" },
  { slug: "technology", name: "Technology", description: "Tech companies and innovation" },
  { slug: "sports", name: "Sports", description: "Sports events and outcomes" },
  { slug: "games", name: "Games", description: "Gaming and esports" },
  { slug: "celebrities", name: "Celebrities", description: "Pop culture and public figures" },
  { slug: "science", name: "Science", description: "Science and research" },
  { slug: "culture", name: "Culture", description: "Arts, media, and culture" },
  { slug: "other", name: "Other", description: "Everything else" },
];

const NARRATIVE_CLUSTERS = [
  {
    slug: "artificial-intelligence",
    name: "Artificial Intelligence",
    description: "AI companies, models, and adoption narratives",
    icon: "🤖",
    canonicals: ["ai", "openai", "nvidia", "chatgpt", "anthropic", "google ai", "llm"],
  },
  {
    slug: "geopolitics",
    name: "Geopolitics",
    description: "International relations, conflict, and policy",
    icon: "🌍",
    canonicals: ["china", "taiwan", "world war 3", "world war iii", "nato", "ukraine", "russia"],
  },
  {
    slug: "crypto",
    name: "Crypto",
    description: "Cryptocurrency and blockchain markets",
    icon: "₿",
    canonicals: ["bitcoin", "ethereum", "solana", "crypto", "defi", "eth", "btc"],
  },
  {
    slug: "technology",
    name: "Technology",
    description: "Tech companies and innovation",
    icon: "⚡",
    canonicals: ["apple", "microsoft", "spacex", "google", "meta", "semiconductors", "quantum-computing", "robotics"],
  },
];

async function main() {
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: { name: cat.name, description: cat.description ?? undefined },
    });
  }
  console.log("Seeded default categories:", DEFAULT_CATEGORIES.length);

  for (const cluster of NARRATIVE_CLUSTERS) {
    const { canonicals, ...data } = cluster;
    const c = await prisma.narrativeCluster.upsert({
      where: { slug: data.slug },
      create: data,
      update: { name: data.name, description: data.description ?? undefined, icon: data.icon ?? undefined },
    });
    const markets = await prisma.market.findMany({
      where: { canonical: { in: canonicals } },
      select: { id: true },
    });
    for (const m of markets) {
      await prisma.narrativeClusterMember.upsert({
        where: {
          clusterId_marketId: { clusterId: c.id, marketId: m.id },
        },
        create: { clusterId: c.id, marketId: m.id },
        update: {},
      });
    }
    console.log("Narrative cluster:", data.slug, "markets:", markets.length);
  }

  // Season 1: Narrative Wars
  const seasonStart = new Date();
  seasonStart.setDate(seasonStart.getDate() - 7);
  const seasonEnd = new Date();
  seasonEnd.setDate(seasonEnd.getDate() + 30);
  await prisma.season.upsert({
    where: { slug: "narrative-wars" },
    create: {
      name: "Narrative Wars",
      slug: "narrative-wars",
      startAt: seasonStart,
      endAt: seasonEnd,
      description: "Top 100 traders earn permanent rank. Compete by ROI, narrative discovery, and volume.",
      topRankCount: 100,
    },
    update: {
      name: "Narrative Wars",
      description: "Top 100 traders earn permanent rank. Compete by ROI, narrative discovery, and volume.",
      topRankCount: 100,
    },
  });
  console.log("Seeded Season 1: Narrative Wars");

  // Alias mapping: prevent duplicate narratives — artificial-intelligence and gpt → ai
  const NARRATIVE_AI_CANONICAL = "ai";
  const ALIASES_TO_AI = ["gpt", "artificial_intelligence"];
  for (const alias of ALIASES_TO_AI) {
    await prisma.marketAlias.upsert({
      where: { alias },
      create: { canonical: NARRATIVE_AI_CANONICAL, alias, normalized: alias },
      update: { canonical: NARRATIVE_AI_CANONICAL, normalized: alias },
    });
  }
  console.log("Seeded narrative aliases: gpt, artificial_intelligence → ai (prevents duplicate narratives)");

  // Curated core narrative markets (~30 global narratives)
  for (const canonical of CORE_NARRATIVE_CANONICALS) {
    const displayName = toDisplayName(canonical);
    const existing = await prisma.market.findUnique({
      where: { canonical },
      select: { id: true, isCoreMarket: true },
    });
    if (existing) {
      if (!existing.isCoreMarket) {
        await prisma.market.update({
          where: { id: existing.id },
          data: { isCoreMarket: true },
        });
      }
      continue;
    }
    await prisma.market.create({
      data: {
        canonical,
        displayName,
        price: INITIAL_PRICE,
        volume: 0,
        tradeCount: 0,
        reserveTokens: INITIAL_RESERVE_TOKENS,
        reserveShares: INITIAL_RESERVE_SHARES,
        status: "active",
        phase: "creation",
        isCoreMarket: true,
      },
    });
    const market = await prisma.market.findUnique({ where: { canonical }, select: { id: true } });
    if (market) {
      await prisma.pricePoint.create({
        data: { marketId: market.id, price: INITIAL_PRICE },
      });
    }
  }
  console.log("Seeded core narrative markets:", CORE_NARRATIVE_CANONICALS.length);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
