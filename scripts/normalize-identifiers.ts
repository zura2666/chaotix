/**
 * Optional migration: normalize existing Market.canonical and MarketAlias to identifier format.
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/normalize-identifiers.ts
 * Or: npx tsx scripts/normalize-identifiers.ts
 *
 * Backward compatibility: adds aliases from old canonical to new normalized form so old URLs still resolve.
 */

import { PrismaClient } from "@prisma/client";
import { normalizeIdentifier, validateIdentifierSafe } from "../src/lib/identifiers";

const prisma = new PrismaClient();

async function main() {
  const markets = await prisma.market.findMany({
    select: { id: true, canonical: true, displayName: true },
  });
  let updated = 0;
  let skipped = 0;
  for (const m of markets) {
    const normalized = normalizeIdentifier(m.canonical);
    if (normalized.length < 3) {
      skipped++;
      continue;
    }
    const validated = validateIdentifierSafe(m.canonical);
    const newCanonical = validated.ok ? validated.value : normalized.slice(0, 32);
    if (newCanonical === m.canonical) {
      skipped++;
      continue;
    }
    const existing = await prisma.market.findUnique({
      where: { canonical: newCanonical },
      select: { id: true },
    });
    if (existing && existing.id !== m.id) {
      skipped++;
      continue;
    }
    await prisma.$transaction([
      prisma.marketAlias.updateMany({
        where: { canonical: m.canonical },
        data: { canonical: newCanonical, normalized: newCanonical },
      }),
      prisma.marketAlias.upsert({
        where: { alias: m.canonical },
        create: { canonical: newCanonical, alias: m.canonical, normalized: newCanonical },
        update: { canonical: newCanonical, normalized: newCanonical },
      }),
      prisma.market.update({
        where: { id: m.id },
        data: { canonical: newCanonical },
      }),
    ]);
    updated++;
    console.log(`Updated ${m.canonical} -> ${newCanonical}`);
  }
  console.log(`Done. Updated: ${updated}, Skipped: ${skipped}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
