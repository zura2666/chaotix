# 03 — Components and Patterns

## ChaotixCard

- **File:** `src/components/ui/ChaotixCard.tsx`
- **Use:** Section containers, profile blocks, create market block, stats
- **Look:** `rounded-2xl border border-white/5 bg-slate-900/40 p-10`, `hover:border-emerald-500/20`, `focus-within:border-emerald-500/20`
- **Props:** `children`, `className?`, `as?: "div" | "article" | "section"`

---

## ChaotixButton

- **File:** `src/components/ui/ChaotixButton.tsx`
- **Base:** `inline-flex h-11 min-h-[2.75rem] items-center justify-center rounded-lg px-5 text-sm font-medium`
- **Variants:**
  - **primary:** `bg-emerald-500 text-white hover:bg-emerald-400` + focus ring
  - **secondary:** `border border-white/10 bg-black/40 backdrop-blur-sm` + hover border/text
  - **ghost:** `text-slate-500 hover:bg-white/5 hover:text-white`
- **Can render as:** `<button>` or `<Link>` if `href` is passed

---

## Input (atomic)

- **File:** `src/components/ui/Input.tsx`
- **Height:** `h-13` (52px) — matches design system standard
- **Look:** Wrapper `rounded-xl border border-white/10 bg-slate-900/50`, `focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20`; input inside is transparent, `text-white placeholder:text-slate-500`
- **Optional:** `leftIcon` (e.g. Search, Lock) inside IconWrapper; `rightSlot` (e.g. nested Continue button)
- **Use:** Search bar, auth modal email/password, any form field that should match the app

---

## IconWrapper

- **File:** `src/components/ui/IconWrapper.tsx`
- **Use:** Consistent icon size (e.g. 24px) and color; wrap Lucide icons so stroke and alignment match
- **Typical:** `className="text-slate-500"` for muted, or `text-emerald-400` for primary

---

## SearchBar

- **File:** `src/components/SearchBar.tsx`
- **Pattern:** Relative container, icon absolute left-4, input with `pl-10`, `h-13`; ⌘K hint; uses Input or equivalent with left icon
- **On home:** Parent gets `search-focal` (emerald glow shadow)

---

## Auth modal

- **File:** `src/components/AuthModal.tsx` (portal into `#auth-modal-portal`)
- **Style:** Overlay (backdrop), centered panel — dark bg, rounded, border white/10
- **Content:** Google button, OR divider, email+Continue (nested in one bordered box), password field, wallet grid; footer "Terms · Privacy" (small text)
- **Email+Continue:** Single container with `focus-within` and `hover` so the whole box illuminates (emerald border/ring)
- **Fields:** h-13, IconWrapper for Lock/User, Chaotix-style borders

---

## Profile dropdown (Header)

- **Width:** 280px
- **User block:** Avatar circle (initial), @username, email, balance in emerald
- **Nav:** Block links (Leaderboard, Create Market, APIs, Portfolio, Admin); then Dark mode row; then Terms, Privacy; then Log out (red, full width)

---

## Empty states

- **File:** `src/components/EmptyState.tsx`
- **Use:** When no markets, no positions, etc. — title, optional description, optional CTA button (e.g. "Create Market" → `/create`)

---

## Market cards (lists)

- **File:** `src/components/MarketCard.tsx` (and optionally MobileMarketCard)
- **Use:** Home, discover, leaderboard — show market name, price, volume, trend; link to `/market/[canonical]`
- **Style:** Should use ChaotixCard or same border/bg/radius so they feel consistent

---

## Modals (general)

- **Pattern:** Fixed overlay, centered panel, rounded-2xl, border-white/10, bg slate-900/50 or #0B0F1A; close on overlay click or X; use Framer Motion for enter/exit
- **Referral modal:** Multi-step (socials, pitch, submit); same visual language as auth modal
