# Phase 11 – Polishing & Production Hardening

This document covers validation, cron, security, DB indexes, health checks, and environment variables added or standardized in Phase 11.

---

## 1. Input Validation (Zod)

- **Location:** `src/lib/api-schemas.ts`
- All state-changing API requests use Zod schemas and a shared `parseBody(schema, body)` helper.
- **Schemas:** `tradeBodySchema`, `liquidityAddBodySchema`, `liquidityRemoveBodySchema`, `marketCreateBodySchema`, `followBodySchema`, `copyTradingBodySchema`, `governanceVoteBodySchema`, `registerBodySchema`, `walletConnectBodySchema`, `commentBodySchema`, `inviteRedeemBodySchema`, `treasuryTransferBodySchema`.
- **Identifier rules:** Market canonical names and usernames use `validateIdentifier` (3–32 chars, a-z 0-9 _ -). Display names use `validateDisplayName` (trim, collapse spaces, max 100 chars).
- **Routes using Zod:** Trade (`POST /api/trade`), Liquidity add/remove, Market creation (`POST /api/markets`), Follow (`POST /api/follow`), Copy trading (`POST /api/copy-trading`), Governance vote (`POST /api/governance/vote`), Auth register (`POST /api/auth/register`).

---

## 2. Centralized Validation Helpers

- **Location:** `src/lib/identifiers.ts`
- `validateIdentifier(str)` / `validateIdentifierSafe(str)` – canonical identifiers (usernames, market canonicals).
- `validateCanonicalName(str)` / `validateCanonicalNameSafe(str)` – alias for market canonical.
- `validateDisplayName(raw)` / `validateDisplayNameSafe(raw)` – display names (spaces allowed, trimmed, max 100).
- `normalizeIdentifier`, `normalizeForLookup`, `slugToDisplayName`, `IDENTIFIER_RULES`.

---

## 3. Cron & Background Jobs

- **Cron auth:** `src/lib/cron-auth.ts` – `assertCronAuth(req)` returns 503 if `CRON_SECRET` is missing or &lt; 16 chars, 401 if token invalid.
- **Cron routes** use `assertCronAuth(req)`:
  - `GET /api/cron/archive-markets`
  - `GET /api/cron/liquidity-rewards`
- **Headers:** `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`.
- **Job queue:** `JOB_QUEUE_PROVIDER=redis` uses `src/lib/redis-job-queue.ts` (LPUSH to Redis list). In-memory otherwise. Failed jobs are logged with type, context, and stack trace in `src/lib/jobs.ts`.

---

## 4. Error Handling

- **Root error boundary:** `src/app/error.tsx` – shows error message, “Try again” and “Go home”.
- API routes return 400 with `{ error: "<message>" }` from Zod or business logic; 500 only for unexpected errors.

---

## 5. Security & Rate Limiting

- **CRON_SECRET:** Enforced on all cron routes; must be set and at least 16 characters.
- **Rate limiting:** In-memory by default. When `RATE_LIMIT_PROVIDER=redis` or `EVENT_BUS_PROVIDER=redis`, trade route uses `checkRateLimitAsync()` (Redis INCR + EXPIRE). Other routes use sync `checkRateLimit()`.
- **CSRF:** When `NODE_ENV=production` and `CSRF_PROTECTION` is not `0`, state-changing routes call `assertCsrf(req)`. Cookie `csrf_token` is set by middleware; client must send same value in `x-csrf-token` header for POST/PUT/DELETE/PATCH. Protected: trade, markets POST, follow, copy-trading, governance vote, liquidity add/remove, register, comments POST.

---

## 6. Database Indexes

- **Added in Prisma schema:**
  - `TradeAttempt`: `@@index([userId, createdAt])`
  - `Activity`: `@@index([userId, createdAt])`
  - `ReferralEarning`: `@@index([referrerId, createdAt])`
  - `LiquidityPosition`: `@@index([userId, createdAt])`
  - `WalletAccount`: `@@index([userId, chain])`
- Existing indexes on `referrerId`, `createdById` (Market), etc. remain.

---

## 7. Health Check

- **GET /api/health** – returns `{ ok, db, redis?, eventBus?, jobQueue?, status }`.
  - `db`: "up" | "down" (Prisma `SELECT 1`).
  - `redis`, `eventBus`, `jobQueue`: "up" | "down" | "disabled" when Redis is configured.
  - 503 if DB or Redis (when required) is unavailable.

---

## 8. Environment Variables

| Variable | Description |
|----------|-------------|
| `CRON_SECRET` | Required for cron routes; min 16 characters. |
| `DATABASE_URL` | Prisma datasource. |
| `EVENT_BUS_PROVIDER` | `memory` (default) or `redis`. |
| `JOB_QUEUE_PROVIDER` | `memory` (default) or `redis`. |
| `REDIS_URL` | e.g. `redis://localhost:6379` when Redis is used. |
| `RATE_LIMIT_PROVIDER` | `redis` for distributed rate limiting (trade route uses async check). |
| `CSRF_PROTECTION` | Set to `0` to disable CSRF (default on in production). |
| `SETTLEMENT_PROVIDER` | `production` to use DB-backed settlement + optional wallet check. |
| `SETTLEMENT_REQUIRE_WALLET` | `1` to require verified wallet for settlement when using production provider. |
| `PUBLIC_LAUNCH_MODE` | Optional; set to `true` for production. |

---

## 9. API Validation Summary

- **Trade:** `action`, `marketId`, `amount` (buy) or `shares` (sell) via `tradeBodySchema`.
- **Liquidity add:** `amount` (min 1) via `liquidityAddBodySchema`.
- **Liquidity remove:** `lpTokens` (positive) via `liquidityRemoveBodySchema`.
- **Market create:** `string` or `q` (required), optional `title`, `description`, `tags` via `marketCreateBodySchema`; canonical validated in `findOrCreateMarket`.
- **Follow:** `userId` or `followingId` via `followBodySchema`.
- **Copy trading:** `traderId` or `userId`, optional `allocation` (0–1) via `copyTradingBodySchema`.
- **Governance vote:** `proposalId`, `vote` (for|against|abstain) via `governanceVoteBodySchema`.
- **Register:** `email`, `password` (min 6), optional `name`, `username` (identifier rules), `referralCode` via `registerBodySchema`.

Error responses use `{ error: "<message>" }` with status 400 for validation/business errors.
