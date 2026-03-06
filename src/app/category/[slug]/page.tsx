import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  getTrendingByCategory,
  getNewestByCategory,
  getBiggestMoversByCategory,
  getHighestVolumeByCategory,
} from "@/lib/category-discovery";
import { MarketCard } from "@/components/MarketCard";
import { ChaotixCard } from "@/components/ui/ChaotixCard";
import { ChaotixButton } from "@/components/ui/ChaotixButton";

type Props = { params: Promise<{ slug: string }> };

function toMarketCard(m: {
  id: string;
  canonical: string;
  displayName: string;
  title: string | null;
  price: number;
  volume: number;
  tradeCount: number;
  tags: string;
  category?: { id: string; slug: string; name: string } | null;
  priceChange?: number;
  change?: number;
}) {
  let tags: string[] = [];
  try {
    const t = JSON.parse(m.tags);
    tags = Array.isArray(t) ? t : [];
  } catch {
    // ignore
  }
  return {
    id: m.id,
    canonical: m.canonical,
    displayName: m.displayName,
    price: m.price,
    volume: m.volume,
    tradeCount: m.tradeCount,
    priceChange: m.priceChange ?? m.change,
    category: m.category,
    tags,
  };
}

function Section({
  title,
  href,
  markets,
}: {
  title: string;
  href: string;
  markets: ReturnType<typeof toMarketCard>[];
}) {
  if (markets.length === 0) return null;
  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-slate-200">{title}</h2>
        <ChaotixButton href={href} variant="ghost" className="shrink-0 text-sm">
          View all
        </ChaotixButton>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {markets.map((m) => (
          <MarketCard key={m.id} market={m} />
        ))}
      </div>
    </section>
  );
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { name: true },
  });
  if (!category) return { title: "Category | Chaotix" };
  return {
    title: `${category.name} Markets | Chaotix`,
    description: `Trade strings related to ${category.name.toLowerCase()} on Chaotix.`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, description: true },
  });
  if (!category) notFound();

  const [trending, newest, movers, topVolume] = await Promise.all([
    getTrendingByCategory(category.id, 10),
    getNewestByCategory(category.id, 10),
    getBiggestMoversByCategory(category.id, 10),
    getHighestVolumeByCategory(category.id, 10),
  ]);

  const baseHref = `/category/${slug}`;

  return (
    <div className="space-y-10">
      <div>
        <Link href="/categories" className="text-sm text-slate-500 hover:text-emerald-400">
          ← Categories
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-100 md:text-3xl">
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-1 text-slate-400">{category.description}</p>
        )}
      </div>

      <Section
        title="Trending"
        href={`${baseHref}?sort=trending`}
        markets={trending.map(toMarketCard)}
      />
      <Section
        title="New markets"
        href={`${baseHref}?sort=newest`}
        markets={newest.map(toMarketCard)}
      />
      <Section
        title="Biggest movers"
        href={`${baseHref}?sort=movers`}
        markets={movers.map(toMarketCard)}
      />
      <Section
        title="Top volume"
        href={`${baseHref}?sort=volume`}
        markets={topVolume.map(toMarketCard)}
      />
    </div>
  );
}
