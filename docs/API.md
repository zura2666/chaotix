# Chaotix API Reference

Base URL: `/api` (relative to your deployment).

---

## Authentication

Most state-changing endpoints require a session cookie. Send `x-csrf-token` header matching the `csrf_token` cookie for POST/PUT/DELETE/PATCH when CSRF is enabled (production).

### POST /api/auth/register (signup)

**Body:** `username` (required, 3–32 chars, alphanumeric + _ -), `email`, `password`, `confirm_password`, optional `name`, `referralCode`.

**Validation:** Password min 6 characters; `password` must equal `confirm_password`; email format; username unique.

**Response:** `{ user: { id, email, name, username, referralCode, balance, isAdmin } }` and session cookie.

### POST /api/auth/login

**Body:** `email_or_username` (or `email` / `username`) and `password`. You can log in with either email or username.

**Response:** `{ user: { id, email, name, username, referralCode, balance, isAdmin } }` and session cookie.

### POST /api/auth/oauth/login

**Body:** `provider` (`"google"` | `"facebook"`), `access_token` (id_token for Google or access_token for Facebook).

**Response:** `{ user }` and session, or `{ needsLink: true, email, message }` when an account with that email already exists (log in with password, then link in settings).

### POST /api/auth/oauth/link

**Auth:** Session required; CSRF required.

**Body:** `provider`, `access_token`. Links the OAuth account to the current user.

---

## Rate Limits

- **Trade:** 30/min per user.
- **Portfolio / Feed:** 60/min per user or IP.
- **Follow / Copy-trading:** 30/min per user.
- **Liquidity add/remove:** 20/min per user.
- **Public / Protocol:** 120/min per IP.

When `RATE_LIMIT_PROVIDER=redis` or `EVENT_BUS_PROVIDER=redis`, limits are Redis-backed (distributed). In production with Redis configured, rate limit checks do not fall back to in-memory.

Responses: `429 Too Many Requests` with `Retry-After: 60` and `{ "error": "Too many requests" }`.

---

## Public & Discovery

### GET /api/search

Query markets by canonical, display name, alias, tags, or creator.

| Query   | Type   | Description      |
|---------|--------|------------------|
| `q`     | string | Search term      |

**Response:** `{ markets: Array<{ id, canonical, displayName, ... }> }`

---

### GET /api/public/discovery

Discovery feed (no auth).

| Query   | Type   | Description   |
|---------|--------|---------------|
| `limit` | number | Default 20, max 30 |

**Response:** `{ feed: Array }`

---

### GET /api/public/markets

List active markets.

| Query   | Type   | Description   |
|---------|--------|---------------|
| `limit` | number | Default 20, max 50 |

**Response:** `{ markets: Array }`

---

### GET /api/public/trades

Recent trades.

| Query     | Type   | Description   |
|-----------|--------|---------------|
| `limit`   | number | Default 20, max 100 |
| `marketId`| string | Optional filter |

**Response:** `{ trades: Array }`

---

### GET /api/public/leaderboard

Leaderboard (reputation, volume).

| Query   | Type   | Description   |
|---------|--------|---------------|
| `limit` | number | Default 20, max 50 |

**Response:** `{ reputation: Array, volume: Array }`

---

## Protocol (read-only)

### GET /api/protocol/markets

Markets list.

| Query   | Type   | Description   |
|---------|--------|---------------|
| `limit` | number | Default 50, max 100 |

**Response:** `{ markets: Array }`

---

### GET /api/protocol/trades

Trades list.

| Query     | Type   | Description   |
|-----------|--------|---------------|
| `limit`   | number | Default 50, max 200 |
| `marketId`| string | Optional       |

**Response:** `{ trades: Array }`

---

### GET /api/protocol/trends

Trending markets.

**Response:** `{ trends: Array }`

---

### GET /api/protocol/liquidity

Liquidity pools.

| Query     | Type   | Description   |
|-----------|--------|---------------|
| `marketId`| string | Optional       |

**Response:** `{ liquidity: Array }`

---

### GET /api/protocol/entities

Market entities.

| Query   | Type   | Description   |
|---------|--------|---------------|
| `limit` | number | Default 50, max 100 |

**Response:** `{ entities: Array }`

---

## Authenticated

### POST /api/trade

Execute buy or sell.

**Body:** `{ action: "buy" | "sell", marketId: string, amount?: number, shares?: number }`

- Buy: `amount` (tokens to spend), required.
- Sell: `shares` (shares to sell), required.

**Response:** `{ tradeId, shares, price, total, fee, balance? }` or `{ error: string }` (400/401/429).

---

### GET /api/portfolio

User portfolio (positions, PnL).

**Response:** `{ positions, balance, ... }` or 401.

---

### GET /api/feed

Activity feed (and trending/gravity).

| Query   | Type   | Description   |
|---------|--------|---------------|
| `limit` | number | Default 30, max 50 |

**Response:** `{ feed, trending, gravity }` or 401.

---

### POST /api/markets

Create or resolve market.

**Body:** `{ string?: string, q?: string, title?: string, description?: string, tags?: string[] }`

At least one of `string` or `q` required (3–32 chars after normalization: a-z, 0-9, _ or -). Optional metadata: title (max 200), description (max 2000), tags (max 10, each 3–32 chars).

**Response:** `{ market }` or `{ error: string }` (400).

---

### POST /api/follow

Follow a user.

**Body:** `{ userId?: string, followingId?: string }`

**Response:** `{ ok: true, followingId }` or 400/401/404.

---

### POST /api/copy-trading

Set copy-trading allocation.

**Body:** `{ traderId?: string, userId?: string, allocation?: number }` (allocation 0–1, default 1).

**Response:** `{ ok: true, traderId, allocation }` or 400/401/404.

---

### POST /api/markets/[canonical]/liquidity/add

Add liquidity.

**Body:** `{ amount: number }` (min 1).

**Response:** `{ lpTokens, ... }` or 400/401/404.

---

### POST /api/markets/[canonical]/liquidity/remove

Remove liquidity.

**Body:** `{ lpTokens: number }` (positive).

**Response:** `{ tokensOut, ... }` or 400/401/404.

---

### POST /api/governance/vote

Cast governance vote.

**Body:** `{ proposalId: string, vote: "for" | "against" | "abstain" }`

**Response:** `{ ok: true, vote }` or 400/401/404.

---

### POST /api/auth/register

Register.

**Body:** `{ email: string, password: string, name?: string, username?: string, referralCode?: string }`

Username if provided: 3–32 chars, a-z, 0-9, _ or -. Password min 6 chars.

**Response:** `{ user }` or `{ error: string }` (400).

---

### POST /api/markets/[canonical]/comments

Create comment.

**Body:** `{ body: string, sentiment?: string }` (body 1–2000 chars).

**Response:** `{ comment }` or 400/401/404.

---

## Health & Admin

### GET /api/health

Health check.

**Response:** `{ ok, db, redis?, eventBus?, jobQueue?, status, settlementPendingCount?, jobQueueLength? }`

- `jobQueueLength` present when `JOB_QUEUE_PROVIDER=redis`.

---

### Cron (admin / scheduler)

- **GET /api/cron/archive-markets** – Archive inactive markets. Header: `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret`.
- **GET /api/cron/liquidity-rewards** – Distribute LP rewards. Same auth.

`CRON_SECRET` must be set and at least 16 characters.

---

## Identifier Rules

- **Canonical / username:** 3–32 characters; only lowercase letters (a-z), numbers (0-9), and separators _ or -. No spaces or special characters.
- **Display name:** Optional; trim, collapse spaces; max 100 characters.
- **Tags:** Each tag 3–32 chars (same as identifier); max 10 tags per market.

Validation errors return `400` with `{ error: "<message>" }`.

---

## Error Responses

| Status | Meaning        |
|--------|----------------|
| 400    | Validation or business rule error; body `{ error: string }`. |
| 401    | Unauthorized (missing or invalid session). |
| 403    | Forbidden (e.g. CSRF failure). |
| 404    | Resource not found. |
| 429    | Rate limit exceeded; `Retry-After` header. |
| 503    | Service unavailable (e.g. DB/Redis down). |
