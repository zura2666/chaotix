# Production Readiness (Post–Phase 11)

Summary of changes applied to reach 9/10 production readiness.

---

## Security & Hardening

- **CSRF:** Cookie-based double submit. Middleware sets `csrf_token` cookie; state-changing APIs (trade, markets, follow, copy-trading, governance, liquidity, register, comments) call `assertCsrf(req)`. Client must send `x-csrf-token` header matching the cookie. Enabled when `NODE_ENV=production` and `CSRF_PROTECTION` ≠ `0`. See `src/lib/csrf.ts`.
- **Rate limiting:** In-memory by default. With `RATE_LIMIT_PROVIDER=redis` or `EVENT_BUS_PROVIDER=redis`, routes use Redis-backed `checkRateLimitAsync()`. **In production** (`NODE_ENV=production`), if Redis is configured but unavailable or fails, the code does **not** fall back to in-memory—the request is treated as rate-limited (denied). See `src/lib/rate-limit.ts`.
- **Cron:** All cron routes use `assertCronAuth(req)` from `src/lib/cron-auth.ts`; `CRON_SECRET` must be set and ≥ 16 characters.
- **Settlement:** `SETTLEMENT_PROVIDER=production` uses `createProductionSettlementProvider()`: updates `TradeSettlement`, optional wallet verification when `SETTLEMENT_REQUIRE_WALLET=1`. Implements `submitTrade`, `confirmTrade`, `syncBalance`. See `src/lib/settlement-provider.ts`.

---

## Validation & Data Integrity

- **Zod:** All major state-changing APIs use schemas in `src/lib/api-schemas.ts` and `parseBody()`.
- **Search:** `GET /api/search` uses `normalizeForLookup(q)` for the search term. See `src/app/api/search/route.ts`.
- **Client hints:** `src/lib/validation-hints.ts` exports `IDENTIFIER_HINT`, `USERNAME_HINT`, `MARKET_CANONICAL_HINT`, `DISPLAY_NAME_HINT`, `TAG_HINT`, `WALLET_ADDRESS_HINT`, and length constants for use in placeholders and help text.

---

## Observability & Health

- **Health:** `GET /api/health` returns `{ ok, db, redis?, eventBus?, jobQueue?, jobQueueLength?, settlementPendingCount?, status }`. Event bus and job queue status (and queue length when `JOB_QUEUE_PROVIDER=redis`) are reported when Redis is configured.
- **Jobs:** Background jobs use retry with exponential backoff in `src/lib/jobs.ts`: up to 3 attempts, backoff base 2s. Failed jobs are logged and audited via `auditJobFailed`; no in-memory fallback for execution when using Redis queue in production.

---

## Database

- **Indexes added:** `ReferralEarning([referrerId, createdAt])`, `LiquidityPosition([userId, createdAt])`, `WalletAccount([userId, chain])`, `Trade([userId, createdAt])` for portfolio/activity. Run `npx prisma db push` or create a migration after pulling.

---

## Testing

- **Unit tests:** `tests/identifiers.test.mjs` (normalize/validate/slugToDisplayName), `tests/pool-amm.test.mjs` (getPriceFromReserves, buyQuote, sellQuote, round-trip). Run with `npm run test` or `node --test tests/*.mjs`.

---

## Env Summary

| Variable | Purpose |
|----------|---------|
| `CRON_SECRET` | Cron auth; min 16 chars |
| `CSRF_PROTECTION` | Set to `0` to disable CSRF |
| `RATE_LIMIT_PROVIDER` | `redis` for distributed rate limiting |
| `EVENT_BUS_PROVIDER` / `JOB_QUEUE_PROVIDER` | `redis` for Redis bus/queue |
| `REDIS_URL` | Redis connection URL |
| `SETTLEMENT_PROVIDER` | `production` for DB-backed settlement |
| `SETTLEMENT_REQUIRE_WALLET` | `1` to require verified wallet for settlement |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID (frontend SDK) |
| `NEXT_PUBLIC_FACEBOOK_APP_ID` | Facebook app ID (frontend SDK) |
| `FACEBOOK_APP_SECRET` | Facebook app secret (backend token verification) |

---

## Auth: Email/Password & OAuth

- **Email/password signup:** `POST /api/auth/register` accepts `username` (required, 3–32 chars, unique), `email`, `password`, `confirm_password` (must match), optional `name`, `referralCode`. Password min 6 characters; validated with Zod. Username and email are unique across all account types.
- **Email/password login:** `POST /api/auth/login` accepts `email`, `password`; returns session and user (including `username`).
- **Password UX:** Auth modal includes show/hide password toggles (eye icon) for password and confirm password fields. Client-side check for password vs confirm_password match before submit.
- **OAuth (Google & Facebook):** Sign-in via auth modal. Tokens validated server-side (Google tokeninfo, Facebook debug_token + Graph `/me`). See `src/lib/oauth-providers.ts`.
- **OAuth endpoints:** `POST /api/auth/oauth/login` (body: `{ provider, access_token }`), optional `POST /api/auth/oauth/link` (link provider to existing account; requires session + CSRF).
- **OAuth username:** New OAuth users get a unique username derived from display name (e.g. "John Doe" → `john_doe`, or `john_doe_1` if taken). Username + email captured and stored.
- **Database:** User has `username` (unique), `email` (unique), `passwordHash` (null for OAuth-only), `oauth_provider`, `oauth_id`, `oauth_email`, `oauth_picture`; unique on `(oauth_provider, oauth_id)`.
- **Account linking:** If OAuth email matches an existing email/password account, API returns `needsLink: true`; user logs in with password then can link via `/api/auth/oauth/link` or profile settings.
- **Profile:** Profile page shows username, email, balance, OAuth provider (if any), and profile picture (from OAuth when available).
- **Security:** OAuth login rate-limited (20/min per IP). Failed OAuth attempts audited. Passwords hashed with bcrypt. CSRF on register and oauth/link.
- **HTTPS:** Use HTTPS in production for redirect URIs and cookies.

---

## Additional Hardening (Latest Pass)

- **Redis-backed rate limiting:** All key routes use `rateLimit429()` / `checkRateLimitAsync()` so when `RATE_LIMIT_PROVIDER=redis` or `EVENT_BUS_PROVIDER=redis` limits are distributed. Applied to: trade, portfolio, feed, follow, copy-trading, liquidity add/remove, public discovery/leaderboard/markets/trades, all protocol routes.
- **Audit logging:** `src/lib/audit.ts` – `auditCronRun`, `auditJobFailed`, `auditSettlementFailure`. Cron routes log runs; failed jobs log to AuditLog; settlement failures log and create AdminAlert.
- **Settlement monitoring:** Production settlement provider calls `auditSettlementFailure` and `alertSettlementFailure` (AdminAlert) on submit failure.
- **Security headers:** Middleware sets `Permissions-Policy: camera=(), microphone=(), geolocation=()` in addition to existing X-Frame-Options, X-Content-Type-Options, Referrer-Policy.
- **Governance→treasury:** When admin sets proposal status to `passed` via `PATCH /api/admin/governance` (body: `{ proposalId, status: "passed" }`), `onProposalPassed(proposalId)` runs: creates AdminAlert and a TreasuryTransfer record (reason: governance_proposal_passed). Audit log entries: `treasury_transfer` on success, `treasury_transfer_failed` on failure. See `src/lib/governance-treasury.ts`.
- **Admin alerts:** `src/lib/admin-alerts.ts` – `alertSettlementFailure`, `alertMarketFreeze`, `alertGovernanceVote`, `alertSuspiciousActivity`.
- **Health:** `GET /api/health` includes `settlementPendingCount` (count of pending/submitted TradeSettlement).
- **Entity extraction:** Uses `normalizeForLookup()` for entity name normalization (consistent with search/canonical).
- **Env validation:** `node scripts/validate-env.mjs` checks required and production-recommended env vars.

## Deployment Checklist

1. **Env:** Set `DATABASE_URL`, and for production: `CRON_SECRET` (≥16 chars), `REDIS_URL`, `RATE_LIMIT_PROVIDER=redis`, `JOB_QUEUE_PROVIDER=redis`, `EVENT_BUS_PROVIDER=redis`, `SETTLEMENT_PROVIDER=production` (optional). Run `npm run validate-env` before deploy.
2. **DB:** Run `npx prisma migrate deploy` or `npx prisma db push` so indexes and schema are applied.
3. **Build & test:** `npm run build` and `npm run test`. Use `scripts/deploy-check.sh` for validate-env + build + test.
4. **Backup:** Use `scripts/backup-db.sh` for periodic DB snapshots (SQLite path from `DATABASE_URL`).
5. **Redis:** Ensure Redis is available for rate limiting and job queue in production to avoid in-memory fallback (production denies when Redis is configured but unavailable).

## Implemented in Latest Pass

- **Job retry/backoff:** Up to 3 attempts with exponential backoff; failed jobs audited via `auditJobFailed`. See `src/lib/jobs.ts`.
- **Production rate limiting:** No in-memory fallback when Redis is configured in production; failures treated as rate-limited.
- **Governance treasury audit:** `treasury_transfer` and `treasury_transfer_failed` audit log entries in `src/lib/governance-treasury.ts`.
- **Milestone notifications:** Trade milestones (100/500/1000) and LP reward milestones (10/50/100) via `src/lib/milestone-notifications.ts`; in-app only (no push).
- **Health job queue length:** `jobQueueLength` in health response when `JOB_QUEUE_PROVIDER=redis`.
- **Client-side validation hints:** SearchBar (market canonical placeholder + title), AuthModal (display name length/hint). See `src/lib/validation-hints.ts`.
- **API documentation:** `docs/API.md` — auth/CSRF, rate limits, public, discovery, protocol, authenticated endpoints, health, cron, identifier rules, error table.
- **Deployment/backup scripts:** `scripts/backup-db.sh` (SQLite backup from DATABASE_URL), `scripts/deploy-check.sh` (validate-env, build, test).

## Phase 12 Additions

- **Mobile components:** `QuickTrade` (mobile-only fast buy/sell on market page), `MobileMarketCard` (compact cards with price, volume, feedScore, sentiment) used on Discover. Market page shows QuickTrade when logged in on small screens; desktop trade panel hidden on mobile.
- **Leaderboard filters:** Client tabs (Volume, Reputation, Profit, ROI, Discoverers, Referrals) in `LeaderboardView`; one section visible at a time for cleaner mobile/UX.
- **Forms & validation:** SearchBar validates canonical (min length, allowed chars) and shows inline error; validation hints from `validation-hints.ts` used in placeholders/titles.
- **Market lifecycle milestones:** When market stage upgrades (emerging→active→established→legendary), creator receives in-app notification (`market_stage_upgrade`). See `src/lib/market-lifecycle-stage.ts` and `NotificationType` in `src/lib/notifications.ts`.

## Not Implemented / Follow-up

- Portfolio PnL time-series (current: bar chart + best/worst)
- Push notifications (browser/mobile)
- Multi-token and multi-chain settlement
- OpenAPI/Swagger or TypeScript SDK (markdown API doc only)
- Automated alerts for stuck jobs, high latency, wash trading, liquidity drains
- Display-name collision prevention
- Stress/load tests (50k users, 500k markets)

These can be added in follow-up work.
