#!/usr/bin/env node
/**
 * Validate required and optional env vars for production.
 * Run: node scripts/validate-env.mjs
 * Exit 0 if valid, 1 otherwise.
 */

const required = [
  "DATABASE_URL",
];

const productionRecommended = [
  "CRON_SECRET",       // min 16 chars
  "EVENT_BUS_PROVIDER", // redis for scale
  "JOB_QUEUE_PROVIDER", // redis for scale
  "RATE_LIMIT_PROVIDER", // redis for distributed limit
];

const optional = [
  "CSRF_PROTECTION",
  "SETTLEMENT_PROVIDER",
  "SETTLEMENT_REQUIRE_WALLET",
  "REDIS_URL",
  "PUBLIC_LAUNCH_MODE",
];

let failed = false;
const env = process.env;

for (const key of required) {
  if (!env[key] || String(env[key]).trim() === "") {
    console.error(`Missing required: ${key}`);
    failed = true;
  }
}

if (env.NODE_ENV === "production") {
  if (!env.CRON_SECRET || env.CRON_SECRET.length < 16) {
    console.error("Production: CRON_SECRET must be set and at least 16 characters");
    failed = true;
  }
}

for (const key of productionRecommended) {
  if (env.NODE_ENV === "production" && !env[key]) {
    console.warn(`Production recommended: ${key}`);
  }
}

if (failed) {
  process.exit(1);
}
console.log("Env validation passed.");
process.exit(0);
