# Migrate SQLite to PostgreSQL

## 1. Use Postgres schema

```bash
cp prisma/schema.postgres.prisma prisma/schema.prisma
```

Or manually set `provider = "postgresql"` in `prisma/schema.prisma` and add any Postgres-specific types (e.g. `String[]` for badges/tags if desired).

## 2. Set environment

```env
DATABASE_URL="postgresql://user:password@host:5432/chaotix?connection_limit=20"
DATABASE_PROVIDER=postgresql
```

## 3. Run migrations

```bash
npx prisma migrate dev --name init
# or in production:
npx prisma migrate deploy
```

## 4. Data migration (SQLite → Postgres)

Option A: Use Prisma to copy data (run a script that connects to both DBs).

1. Export from SQLite (e.g. run script with `DATABASE_URL=file:./dev.db`):
   - Read all User, Market, Position, Trade, ReferralEarning, PricePoint, TradeAttempt.
2. Point `DATABASE_URL` to Postgres.
3. Insert in order (User → Market → Position → Trade → ReferralEarning → PricePoint → TradeAttempt).

Option B: Use `pgloader` or custom ETL.

Example script structure (Node):

```js
// scripts/migrate-data.mjs
import { PrismaClient as SqliteClient } from '@prisma/client'; // build with sqlite schema
import { PrismaClient as PgClient } from '@prisma/client';     // build with postgres schema
// Or run two processes: one reads SQLite, outputs JSON; other reads Postgres, inserts.
```

## 5. Indexes

The Postgres schema includes indexes on:

- **markets**: canonical (unique), tradeCount, volume, lastTradeAt, phase
- **trades**: marketId, userId, createdAt, (marketId, createdAt)
- **users**: referralCode

Connection pooling: use `?connection_limit=20` in URL or a pooler like PgBouncer.
