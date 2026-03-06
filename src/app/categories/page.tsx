import Link from "next/link";
import { prisma } from "@/lib/db";
import { ChaotixCard } from "@/components/ui/ChaotixCard";

export const metadata = {
  title: "Categories | Chaotix",
  description: "Browse prediction markets by category on Chaotix.",
};

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { markets: true } },
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-100 md:text-3xl">
          Categories
        </h1>
        <p className="mt-1 text-slate-400">
          Browse markets by category. Trending and newest inside each.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <Link key={cat.id} href={`/category/${cat.slug}`}>
            <ChaotixCard as="div" className="p-6 transition-colors hover:border-emerald-500/20">
              <h2 className="text-lg font-semibold text-slate-100">{cat.name}</h2>
              {cat.description && (
                <p className="mt-1 text-sm text-slate-500 line-clamp-2">{cat.description}</p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                {cat._count.markets} market{cat._count.markets !== 1 ? "s" : ""}
              </p>
            </ChaotixCard>
          </Link>
        ))}
      </div>
    </div>
  );
}
