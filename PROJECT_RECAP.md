# Chaotix — Project Recap

*A short introduction, how it works, the build, and potential so any person or AI can understand the concept.*

---

## Introduction

**Chaotix** is a web platform for **speculative prediction markets on “strings.”** Its tagline is **“Trade Nothing. Trade Everything.”** — meaning you trade attention and speculation, not real money or real assets. Markets are built around **canonical strings** (e.g. ticker-like symbols such as `$ELON`, `$AGI`, or any phrase). Each string has **one canonical market**: one price, one order book, one place to bet on that idea. The product is for entertainment, education, and gauging sentiment — not for financial advice or real-world settlement. Users get an in-app balance, take positions, and see PnL; nothing is real currency or securities.

---

## How It Works

- **Markets**  
  A market is defined by a **canonical string** (e.g. `$MEME` or “Will X happen?”). Creators can add a title and description. The market has a **price** (between 0 and 1), **volume**, **reserves** (tokens/shares for a simple AMM-style liquidity model), and a **phase** (e.g. creation → active). One canonical string = one market globally.

- **Trading**  
  Users **buy or sell shares** in a market at the current price. Trades update the market price and volume. Users hold **positions** (shares, average price, realized/unrealized PnL). All of this uses an **in-app balance** (stored in the database); the codebase is structured so this can later be swapped for wallet/on-chain balance.

- **No real money**  
  Balances, trades, and PnL are **in-platform only**. They do not represent real money, securities, or claims on any external asset. The system is built so that “strings” represent attention and speculation, not real-world outcomes or financial instruments.

- **Discovery & ranking**  
  Markets can be **trending**, **newest**, **biggest movers**, or ranked by a **gravity score**. There is **discover**, **leaderboard** (e.g. by volume, referral earnings), and **search**. Users have **portfolios** (positions, total value, realized/unrealized PnL) and **profiles** (username, stats, referral section).

- **Referral & creator program**  
  Users can **apply** to become referral partners (social handles + pitch). Once **approved**, they get a **partner code** (e.g. `CHX-ABC-42`) and a **short link** (e.g. `/r/zura`). Referrers earn from referred users’ activity. The profile shows **Apply** / **Pending** / **Partner dashboard** (copy link, stats) depending on status.

- **Auth**  
  Sign-in options: **email/password**, **Google OAuth**, and **wallet** (e.g. RainbowKit / SIWE). Session is cookie-based; profile can include wallet address and OAuth provider. **Waitlist** and **invite codes** can gate access.

---

## The Build

- **Stack**  
  **Next.js 14** (App Router), **React 18**, **TypeScript**, **Tailwind CSS**, **Prisma** (SQLite by default), **Framer Motion**. Auth: custom session + **NextAuth** (OAuth, adapter) and **RainbowKit/wagmi/viem** for wallet (SIWE). **Zod** for validation, **React Query** for client data.

- **Design**  
  “Aether” design system: dark theme, obsidian/slate palette, emerald accents, max-width 1440px container, standard input/button heights, glass-style header (blur), ChaotixCard/ChaotixButton atoms. **Terms** and **Privacy** pages are wired in footer and auth modal.

- **Main surfaces**  
  **Home**: trending, newest, biggest movers, gravity markets. **Market page** (`/market/[canonical]`): trade UI, price, volume, positions, comments. **Create market** (`/create`): confirm canonical string, title, description (logged-in only). **Profile**: avatar, stats, Create Market CTA, referral section (apply vs partner dashboard). **Portfolio**: positions, total value, realized/unrealized PnL, best/worst markets. **Leaderboard**, **Discover**, **Referrals dashboard**, **User page** (`/u/[username]`). **Short referral links** (`/r/[slug]`) redirect to home with ref param.

- **Backend / data**  
  **Prisma** models: User (balance, referral fields, trust/reputation, OAuth/wallet), Market (canonical, price, volume, reserves, phase, stage, gravity, etc.), Position, Trade, ReferralApplication, ReferralEarning, LiquidityPool, PricePoint, MarketComment, Notifications, and admin/moderation/analytics-related tables. **APIs**: auth (login, callback, me), markets (CRUD, list), trade, referral (apply, admin approve/reject), leaderboard, follow, copy-trading, etc. **Balance** is in-DB (debit/credit); architecture allows a future wallet/on-chain source.

- **Admin**  
  Admin-only routes for **referrals** (list applications, approve/reject), **moderation**, **liquidity**, **treasury**, **market merge**, **market intelligence**, **economics**, **attack simulation**, etc.

---

## Potential

- **Attention as an asset class**  
  Chaotix treats “strings” as tradeable units of attention and speculation. That can extend to memes, narratives, creator tokens, or event-driven markets — all without real money, as a sandbox for sentiment and virality.

- **Creator & referral flywheel**  
  Approved partners drive signups and volume; they earn from referred activity and get shareable links. That supports growth and a creator economy layer on top of speculation.

- **Product and tech evolution**  
  The codebase is set up for **wallet/on-chain** balance and settlement (e.g. TradeSettlement, optional wallet checks). Markets could be linked to events, clusters, or external data; trust scores, reputation, and moderation are already modeled.

- **Clarity for users and regulators**  
  “Trade Nothing. Trade Everything.” and in-app-only balances make the **no real money / no financial advice** stance explicit, which helps both user understanding and compliance positioning.

---

## Conclusion

**Chaotix** is a **speculation platform** where users trade **canonical-string markets** with an **in-app balance** — no real money, no real assets. It combines **prediction-market-style mechanics** (one market per string, price, volume, positions) with **discovery** (trending, gravity, leaderboards), **referral/partner program**, and **multiple sign-in options** (email, OAuth, wallet). The **build** is a modern Next.js + Prisma + TypeScript app with a dark “Aether” UI, full trading and portfolio flows, and admin tooling. The **potential** lies in treating attention and narrative as tradeable abstractions, powering a creator-referral loop, and optionally moving balance/settlement on-chain later. For anyone (human or AI) reading the repo or product: think of it as **“Polymarket-style markets on ticker-like strings, in-app only, with referrals and a path to wallet integration.”**
