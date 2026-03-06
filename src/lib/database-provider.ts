/**
 * Database provider abstraction.
 * Use DATABASE_PROVIDER=postgresql or infer from DATABASE_URL.
 */

export type DatabaseProvider = "sqlite" | "postgresql";

export function getDatabaseProvider(): DatabaseProvider {
  const env = process.env.DATABASE_PROVIDER?.toLowerCase();
  if (env === "postgresql" || env === "postgres") return "postgresql";
  if (env === "sqlite") return "sqlite";
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("postgres") || url.startsWith("postgresql")) return "postgresql";
  return "sqlite";
}

export function isPostgres(): boolean {
  return getDatabaseProvider() === "postgresql";
}

/** Connection pool limit for Postgres (add ?connection_limit=20 to URL in production). */
export const DEFAULT_POOL_SIZE = 10;
