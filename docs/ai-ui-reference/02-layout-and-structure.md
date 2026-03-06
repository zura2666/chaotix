# 02 — Layout and Structure

## Page shell (root layout)

- **File:** `src/app/layout.tsx`
- **Structure:**
  - `<html lang="en" className="dark">`
  - `<body>`: font variables, `font-sans antialiased text-slate-400`, background = radial gradient `from-slate-900 via-black to-black`
  - **Providers** → **AuthModalProvider** → **RefCapture**, **Header**, **Onboarding**, **main**, **Footer**, **Toaster**, **auth-modal-portal**

---

## Header

- **File:** `src/components/Header.tsx`
- **Height:** `h-20` (80px) — sticky, full width
- **Style:** `sticky top-0 z-50 h-20 border-b border-white/5 bg-black/60 backdrop-blur-xl`
- **Content (inside MaxContainer):**
  - Left: Logo "CHAOTIX" (`text-emerald-400 glow-neon`) + tagline "— Trade Nothing. Trade Everything." (hidden on small screens)
  - Center: **SearchBar** (max-w-2xl, on home it has `search-focal` shadow)
  - Right: Nav cluster (NotificationBell, profile dropdown or Log in / Sign up buttons)
- **Profile dropdown:** `w-[280px]`, `rounded-2xl border border-white/10 bg-[#0B0F1A]`, user block (avatar, @username, email, balance), nav links (Leaderboard, Create Market, APIs, Portfolio, Admin if admin), Dark mode row, Terms / Privacy, Log out (red)
- **Nav items:** `rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white`

---

## Main content

- **Wrapper:** `<main className="min-h-screen">` in layout; inside it **MainLayout** wraps **children**
- **MainLayout:** `src/components/MainLayout.tsx` — applies **MaxContainer** + `py-20 md:py-24 lg:py-32` to page content
- **MaxContainer:** `src/components/MaxContainer.tsx` — applies class `max-container`

---

## Max container (content width)

- **Class:** `.max-container` in `globals.css` → `mx-auto w-full max-w-[1440px] px-6 md:px-12`
- All main content (header inner, footer inner, page content) is constrained to 1440px and centered; padding prevents content touching the edges on small screens

---

## Footer

- **File:** `src/components/Footer.tsx`
- **Style:** `border-t border-white/5 py-12`
- **Content:** Single row — left: "Chaotix — Trade Nothing. Trade Everything."; right: links (Terms, Privacy, Leaderboard, Twitter, Discord) — `text-xs text-slate-500`, links `hover:text-emerald-400`

---

## Vertical rhythm

- **Sections on pages:** Use `space-y-24` or `gap-y-12` between major blocks; section headings often `mb-6`
- **Cards in a grid:** `gap-4` or `gap-6`; use ChaotixCard for each block
