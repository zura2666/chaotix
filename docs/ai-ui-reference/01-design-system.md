# 01 — Design System (Aether)

## Colors

### Surfaces & background
- **Page background:** `#020617` (obsidian) — CSS var `--aether-page`; Tailwind `chaos-page`, `bg-[#020617]`
- **Body gradient (current):** `from-slate-900 via-black to-black` (radial ellipse at top)
- **Card / surface:** `#0B0F1A` — `--aether-surface`, `--aether-card`; use `bg-slate-900/40` or `bg-[#0B0F1A]`
- **Surface hover:** `#0D121F` — `--aether-surface-hover`
- **Border (default):** `rgba(255,255,255,0.05)` — `border-white/5`; inputs/panels often `border-white/10`

### Actions & semantics
- **Primary / success / CTA:** Emerald `#10b981` — `--aether-action`, `text-emerald-400`, `bg-emerald-500`, `hover:bg-emerald-400`
- **Focus ring:** `ring-emerald-500/60`, `ring-offset-2`, `ring-offset-black`
- **Danger / error:** `#f43f5e` — `--aether-danger`, `text-red-400`, `bg-red-500/10` for hover

### Typography
- **Headings:** `text-slate-100`, `font-semibold`, `tracking-tighter`
- **Body / muted:** `text-slate-400`, `text-slate-500` (secondary)
- **Bright text:** `text-white` for emphasis

### Tailwind chaos palette (tailwind.config.ts)
- `chaos-page`, `chaos-glow`, `chaos-card`, `chaos-border`, `chaos-muted`, `chaos-neon`, `chaos-emerald`, `chaos-danger`, `chaos-navy`, etc.

---

## Typography

- **Fonts:** Inter (sans) and JetBrains Mono (mono), loaded in `layout.tsx`; use `font-sans`, `font-mono`
- **h1:** `clamp(2rem, 5vw, 3.75rem)`, `font-semibold`, `text-slate-100`
- **h2–h6:** `font-semibold tracking-tighter text-slate-100`
- **p:** `leading-relaxed text-slate-400`
- **Small / captions:** `text-xs text-slate-500` or `text-sm text-slate-500`

---

## Spacing & rhythm

- **Standard control height:** 52px — CSS `--h-standard: 52px`; Tailwind `h-13` (3.25rem), class `.h-standard`
- **Sections:** `py-20 md:py-24 lg:py-32` on main content; internal `gap-y-12` for card spacing
- **Container padding:** `px-6 md:px-12` (and optionally `lg:px-20`) inside max container
- **8px grid:** Prefer multiples of 4/8 for spacing (e.g. `gap-4`, `p-6`, `mb-8`)

---

## Borders & radius

- **Default border:** `border border-white/5` or `border-white/10`
- **Cards / panels:** `rounded-2xl` (or `rounded-xl` for smaller blocks)
- **Buttons / inputs:** `rounded-lg` or `rounded-xl`

---

## Focus & accessibility

- **Focus visible:** `outline-none ring-2 ring-emerald-500/60 ring-offset-2 ring-offset-black`
- **Input focus:** No heavy outline; use `focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/20` on wrapper
- **Selection:** `--aether-selection-bg`, `--aether-selection-text` (emerald tint)

---

## Shadows & effects

- **Card hover:** `hover:border-emerald-500/20`
- **Glow (text):** `glow-neon` → `0 0 20px rgba(16, 185, 129, 0.5)`; `shadow-emerald-glow`
- **Header:** `backdrop-blur-xl`, `bg-black/60`
- **Scrollbar:** Custom in globals — track `rgba(15,23,42,0.5)`, thumb `rgba(148,163,184,0.3)`

---

## Animations (Tailwind)

- `animate-fade-in`, `animate-slide-in-right`, `animate-glow-pulse`, `animate-float`
- Use Framer Motion for modals and complex transitions (`motion.div`, `AnimatePresence`)

---

## Zoom note

- **Site zoom:** `html { zoom: 1.1 }` in globals (with font-size fallback). Layout and text are tuned for this.
