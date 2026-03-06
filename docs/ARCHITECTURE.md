# Chaotix Platform Architecture

Market-driven asset trading ecosystem where value emerges from demand, trading activity, social hype, scarcity, and creator reputation.

---

## 1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Next.js)                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Pages: Homepage | Discover | Marketplace | Asset | Profile | Creator Dashboard   │
│  Components: TradingView | OrderBook | PriceChart | Portfolio | Watchlist         │
│  Real-time: Polling (15s) → [Future: WebSocket client]                            │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER (Next.js API Routes)                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│  /api/marketplace/*  │  /api/auth/*  │  /api/notifications  │  /api/follow        │
│  /api/search         │  /api/feed    │  /api/competition     │  /api/leaderboard   │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SERVICE LAYER (src/lib)                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│  marketplace.ts      │ Price discovery, order book, matching, escrow              │
│  marketplace-demand  │ Demand score, trending score, rankings                     │
│  marketplace-trust    │ Trust score, verification, disputes                       │
│  marketplace-feed    │ Activity feed, trending discussions                       │
│  notifications        │ Create, list, mark read                                   │
│  activity-feed        │ Record activity, get feed for user                         │
└─────────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                           │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Prisma ORM  ──────►  SQLite (dev) / PostgreSQL (prod)                            │
│  Redis (optional) ──► Rate limit, event bus, job queue                            │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema (Marketplace Core)

### Users
| Field | Type | Purpose |
|-------|------|---------|
| id | String | PK |
| username | String | Display |
| email | String | Auth |
| reputation_score | Float | Platform reputation |
| trust_score | Float | General trust |
| marketplaceTrustScore | Float | Marketplace-specific (0-100) |
| marketplaceVerifiedAt | DateTime? | Verified badge |
| marketplaceCompletedTrades | Int | Cached trade count |

### Assets
| Field | Type | Purpose |
|-------|------|---------|
| id | String | PK |
| title | String | Display |
| description | String? | Details |
| category | String | player, collectible, service, etc. |
| creator_id | String | FK User |
| supply_model | fixed/limited/unlimited | Supply rules |
| total_supply | Float | Circulating |
| max_supply | Float? | Cap for limited |
| current_price | Float | Last trade price |
| market_cap | Float | totalSupply × currentPrice |
| demand_score | Float | 0-100 weighted signals |
| liquidity_score | Float | 0-100 volume, spread, depth |
| trending_score | Float | 0-100 time-weighted growth |
| volume24h | Float | 24h volume |
| price_change24h | Float | % change |
| verification_status | String | unverified/pending/verified |
| metadata | JSON | tags[], media[], imageUrl |

### Listings (Asks)
| Field | Type | Purpose |
|-------|------|---------|
| id | String | PK |
| asset_id | String | FK Asset |
| seller_id | String | FK User |
| quantity | Float | Amount |
| unit_price | Float | Ask price |
| status | active/filled/cancelled/frozen | |

### Bids
| Field | Type | Purpose |
|-------|------|---------|
| id | String | PK |
| asset_id | String | FK Asset |
| bidder_id | String | FK User |
| quantity | Float | Amount |
| unit_price | Float | Bid price |
| status | active/filled/cancelled | |

### Trades
| Field | Type | Purpose |
|-------|------|---------|
| id | String | PK |
| asset_id | String | FK Asset |
| buyer_id | String | FK User |
| seller_id | String | FK User |
| quantity | Float | Filled qty |
| unit_price | Float | Execution price |
| listing_id | String? | Matched listing |
| bid_id | String? | Matched bid |

### Price_History (AssetPricePoint)
| Field | Type | Purpose |
|-------|------|---------|
| asset_id | String | FK Asset |
| price | Float | Price at timestamp |
| timestamp | DateTime | When |

### Follows
| Model | Purpose |
|-------|---------|
| UserFollow | user_id, followed_user_id |
| MarketplaceWatchlist | user_id, asset_id (Asset_Follows) |

### Comments
| Model | Purpose |
|-------|---------|
| AssetComment | asset_id, user_id, body, parent_id |

### Search_Analytics
| Model | Purpose |
|-------|---------|
| AssetPageView | asset_id, user_id, timestamp |
| AssetSearch | asset_id, user_id, query |

---

## 3. API Endpoints (Marketplace)

### Discovery & Search
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/marketplace/assets | List assets (category, limit, offset, **filters**) |
| GET | /api/marketplace/search | **Search assets** (q, category, sort) |
| GET | /api/marketplace/rankings | Trending, rising, volume, trades |

### Asset
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/marketplace/assets/[id] | Get asset |
| POST | /api/marketplace/create | Create asset |
| GET | /api/marketplace/assets/[id]/order-book | Order book |
| GET | /api/marketplace/assets/[id]/price-history | Price history |
| GET | /api/marketplace/assets/[id]/trades | Trade history |
| GET | /api/marketplace/assets/[id]/holding | User holding |
| GET/POST | /api/marketplace/assets/[id]/comments | Comments |
| POST | /api/marketplace/assets/[id]/buy | Market buy |
| POST | /api/marketplace/assets/[id]/sell | Market sell |
| POST | /api/marketplace/assets/[id]/listings | Create listing (limit ask) |
| POST | /api/marketplace/assets/[id]/bids | Create bid (limit bid) |

### Portfolio & Orders
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/marketplace/portfolio | Holdings, PnL |
| GET | /api/marketplace/me/orders | Open listings + bids |
| GET | /api/marketplace/me/trades | Trade history |
| GET | /api/marketplace/watchlist | Watchlist |

### Trust & Moderation
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/marketplace/trust/[userId] | Trust score |
| POST | /api/marketplace/report | Report asset/user |
| POST | /api/marketplace/disputes | Create dispute |
| POST | /api/marketplace/escrow/[id]/resolve | Release/refund escrow |
| POST | /api/marketplace/feedback | Trade feedback |

### Social & Growth
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/marketplace/feed | Activity feed |
| GET | /api/marketplace/leaderboard | Top traders/creators |
| GET | /api/marketplace/creator/dashboard | Creator analytics |
| GET/POST | /api/marketplace/alerts | Price alerts |
| GET/POST | /api/marketplace/auctions | Auctions |
| GET/POST | /api/marketplace/bundles | Bundles |

---

## 4. Frontend Component Tree

```
App
├── Layout (Header, Footer)
│   ├── SearchBar / SearchOverlay
│   ├── NotificationBell
│   └── AuthModal
├── Homepage
│   └── TrendingAssets | MarketStats
├── Marketplace
│   ├── MarketplacePage
│   │   ├── MarketplaceRankings (trending, rising, volume)
│   │   └── AssetCard[] (grid)
│   ├── AssetPage ([id])
│   │   └── TradingView
│   │       ├── PriceChart (AreaChart)
│   │       ├── OrderBook (asks/bids)
│   │       ├── BuySellPanel (market + limit)
│   │       ├── RecentTrades
│   │       ├── Comments
│   │       ├── FollowCreatorButton
│   │       ├── WatchlistButton
│   │       ├── ShareButton
│   │       └── PriceAlertForm
│   ├── Portfolio
│   ├── Watchlist
│   ├── Trades
│   ├── CreatorDashboard
│   ├── Feed
│   └── Leaderboard
├── Profile (u/[username])
│   └── TrustBadge | ReputationLevel
└── Discover (prediction markets)
```

---

## 5. Market Algorithm Design

### Price Discovery
- **Market price** = last completed trade price (Asset.currentPrice)
- **Order book**: Lowest ask = sell price; highest bid = buy pressure
- **Matching**: Buy hits asks (lowest first); sell hits bids (highest first)

### Demand Score (0–100)
Weighted signals:
- Page views (AssetPageView)
- Bids (newBids24h)
- Trade volume (volume24h)
- Search frequency (AssetSearch)
- Watchlist additions (watcherCount)
- New buyers (newBuyers24h)

### Trending Score (0–100)
Time-weighted growth in demand over 24h with decay.

### Liquidity Score (0–100)
- Trade volume
- Active traders
- Spread (lowest ask − highest bid)
- Order book depth

### Rankings (updated every few minutes)
- **Trending**: High trendingScore
- **Rising**: High demand growth
- **Volume**: High volume24h
- **Trades**: High tradeCount24h
- **Newly popular**: Recent activity spike

### Trust Score (0–100)
- Completed trades (+)
- Disputes lost (−)
- Verification (+)
- Community feedback (avg rating)

---

## 6. Real-Time Strategy (Future)

| Channel | Purpose |
|---------|---------|
| WebSocket /order-book | Live order book updates |
| WebSocket /trades | New trades feed |
| WebSocket /price | Price changes |
| WebSocket /notifications | Push notifications |
| Redis Pub/Sub | Backend event distribution |

Current: Polling every 15s for order book, trades, holdings.

---

## 7. Cold Start Mitigation

1. **Seed liquidity**: Bootstrap assets with initial listings/bids
2. **Creator incentives**: Reward early creators
3. **Referral program**: Existing referral system
4. **Waitlist → invite**: inviteCodeUsed, waitlistStatus
5. **Simulated activity**: market-activity-simulation cron (for markets)
6. **Discovery**: Trending/rising surfaces new assets

---

## 8. Gaps Addressed (Additions Only)

| Gap | Addition |
|-----|----------|
| Marketplace search | `/api/marketplace/search` + `searchAssets()` |
| Discovery filters | `listAssets()` extended with price, volume, demand, liquidity |
| Fuzzy search | Title/description contains (SQLite LIKE) |
