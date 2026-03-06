# 04 — Pages Overview

Quick reference for what each main route shows so the AI knows context when fixing UI.

| Route | Purpose | Key UI |
|-------|---------|--------|
| **/** | Home | Hero/tagline, SearchBar (focal), sections: Trending, Newest, Biggest movers, Gravity markets; MarketCard grids; EmptyState when no data |
| **/market/[canonical]** | Single market | Market name, price, volume; QuickTrade (buy/sell); positions; chart; comments; ChaotixCard sections |
| **/create** | Create market | Form: canonical string, title, description; ChaotixButton submit; only when logged in |
| **/profile** | User profile | Avatar, username, email; ProfileStats (balance, etc.); Create Market CTA (ChaotixCard); ProfileReferralSection (Apply / Pending / Partner dashboard) |
| **/portfolio** | User portfolio | Total value, PnL cards; PortfolioChart; best/worst markets; positions table |
| **/leaderboard** | Leaderboards | Tabs or sections for different leaderboards; table or card list |
| **/discover** | Discover markets | Market list/grid; filters/search |
| **/terms** | Terms of Service | Long text, sections, max-w-3xl; link back to home and Privacy |
| **/privacy** | Privacy Policy | Same layout as Terms |
| **/u/[username]** | Public user page | User info, stats, link to leaderboard |
| **/r/[slug]** | Referral short link | Redirect to home with ref param (no custom UI) |
| **/admin/** | Admin dashboards | Tables, stats cards; admin-only |

All pages sit inside the same shell: Header (h-20, blur) + MainLayout (max container + vertical padding) + Footer.
