import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

async function main() {
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      create: cat,
      update: { name: cat.name, description: cat.description ?? undefined },
    });
  }
  console.log("Seeded default categories:", DEFAULT_CATEGORIES.length);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
