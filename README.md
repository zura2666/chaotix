# Chaotix

**Trade Nothing. Trade Everything.**

A trading platform where users trade strings—words, names, ideas, countries, events. Each unique string has one canonical market. Price changes with buying and selling activity.

## Stack

- **Next.js 14** (App Router)
- **SQLite** + **Prisma**
- **Tailwind CSS**
- **Recharts** for price charts

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up the database:
   ```bash
   cp .env.example .env
   npx prisma generate
   npx prisma db push
   ```

3. Run the dev server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

## Features

- **User accounts** — Email/password auth, profile, balance (mock token), referral code
- **String markets** — One canonical market per string (case-insensitive, trimmed). Create by searching or visiting `/market/your-string`
- **Trading** — Buy/sell shares; AMM-style pricing; 1% fee (50% platform, 50% to referrer if applicable)
- **Trending** — Homepage shows trending, newest, and biggest movers
- **Referrals** — Each user has a code; referrers earn 50% of trading fees from referred users
- **Leaderboards** — Top traders by volume, top referral earners

## Env

- `DATABASE_URL` — e.g. `file:./dev.db` for SQLite, or `postgresql://...` for Postgres
- `DATABASE_PROVIDER` — optional: `sqlite` | `postgresql` (auto-detected from URL if unset)

## Production (PostgreSQL)

1. Use the Postgres schema and run migrations:
   ```bash
   cp prisma/schema.postgres.prisma prisma/schema.prisma
   # Set DATABASE_URL to your Postgres connection string (use ?connection_limit=20 for pooling)
   npx prisma migrate dev --name init
   ```
2. See `scripts/migrate-sqlite-to-postgres.md` for migrating data from SQLite.

## Production features (included)

- **Market lifecycle** — Phases (creation → discovery → active → dormant), circuit breaker on large price moves
- **Liquidity health** — `GET /api/markets/liquidity-health?canonical=...`; UI shows Healthy / Thin / Risky
- **Real-time** — SSE at `GET /api/events?stream=market:canonical` or `?stream=trending`
- **Anti-manipulation** — Suspicious activity scoring, admin alerts, flagged users/markets (schema)
- **Admin economics** — `/admin/economics` for revenue, fees, referral payouts, growth
- **Security** — Global rate limit in middleware, audit log and analytics event tables, sanitized market strings
- **Growth** — Market OG image, SEO metadata, share button, optional title/description/tags on create

## Scripts

- `npm run dev` — Start dev server (Turbopack)
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run db:push` — Push Prisma schema to DB
- `npm run db:studio` — Open Prisma Studio
