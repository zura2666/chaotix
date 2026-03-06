# 05 — File Map (Where to Change What)

Use this to tell the AI (or yourself) exactly which file to edit for a UI change.

| What you want to change | File(s) |
|-------------------------|--------|
| **Global colors, typography, spacing, scrollbar, .max-container** | `src/app/globals.css` |
| **Tailwind theme (chaos colors, animations, shadows, fonts)** | `tailwind.config.ts` (root) |
| **Site shell (html, body, fonts, Header/Footer placement)** | `src/app/layout.tsx` |
| **Header (logo, search, nav, profile dropdown)** | `src/components/Header.tsx` |
| **Footer (links, tagline)** | `src/components/Footer.tsx` |
| **Main content wrapper (max width, vertical padding)** | `src/components/MainLayout.tsx`, `src/components/MaxContainer.tsx` |
| **Search bar (global)** | `src/components/SearchBar.tsx` |
| **Auth modal (login/signup)** | `src/components/AuthModal.tsx`, `src/components/auth/AuthModalViews.tsx` |
| **Card component** | `src/components/ui/ChaotixCard.tsx` |
| **Button component** | `src/components/ui/ChaotixButton.tsx` |
| **Input component** | `src/components/ui/Input.tsx` |
| **Icon wrapper** | `src/components/ui/IconWrapper.tsx` |
| **Home page content** | `src/app/page.tsx`, `src/app/HomeContent.tsx` |
| **Market page** | `src/app/market/[canonical]/page.tsx`, `src/app/market/[canonical]/MarketView.tsx` |
| **Create market** | `src/app/create/page.tsx`, `src/app/create/CreateMarketForm.tsx` |
| **Profile page** | `src/app/profile/page.tsx`, `ProfileStats.tsx`, `ReferralProfile.tsx` |
| **Portfolio page** | `src/app/portfolio/page.tsx`, `src/app/portfolio/PortfolioChart.tsx` |
| **Leaderboard** | `src/app/leaderboard/page.tsx`, `LeaderboardView.tsx` |
| **Terms / Privacy** | `src/app/terms/page.tsx`, `src/app/privacy/page.tsx` |
| **Market cards (lists)** | `src/components/MarketCard.tsx` |
| **Empty states** | `src/components/EmptyState.tsx` |
| **Referral UI (profile section, modal)** | `src/components/referral/ProfileReferralSection.tsx`, `ReferralModal.tsx` |
