# Chaotix Design System Audit Report

**Date:** Audit performed against docs 01–05.  
**Scope:** Core layout, global components, globals.css, base UI components.

---

## 1. Header (Header.tsx)

| Check | Spec | Status | Notes |
|-------|------|--------|--------|
| Height | `h-20` | ✅ Pass | Line 28: `h-20` |
| Backdrop & border | `backdrop-blur-xl`, `border-white/5` | ✅ Pass | `bg-black/60 backdrop-blur-xl`, `border-b border-white/5` |
| Profile dropdown width | `w-[280px]` | ✅ Pass | Line 80 |
| Dropdown shape & surface | `rounded-2xl`, `border-white/10`, `bg-[#0B0F1A]` | ✅ Pass | Line 80 |
| Nav items | `rounded-lg px-3 py-2 text-sm`, `hover:bg-white/5 hover:text-white` | ✅ Pass | All nav Links use these classes |
| Logo | `text-emerald-400` + `glow-neon` | ✅ Pass | Line 35: `text-emerald-400 glow-neon` |

**Header: No discrepancies found.**

---

## 2. MaxContainer & MainLayout

| Check | Spec | Status | Notes |
|-------|------|--------|--------|
| MaxContainer class | `max-w-[1440px]`, `px-6 md:px-12` | ✅ Pass | globals.css `.max-container` |
| Optional `lg:px-20` | Design doc 02: optional | 🔧 Fixed | **Was missing.** Added `lg:px-20` to `.max-container` in globals.css to match MaxContainer.tsx comment. |
| MainLayout spacing | `py-20 md:py-24 lg:py-32` | ✅ Pass | MainLayout.tsx line 9 |
| All pages use MaxContainer | Via MainLayout | ✅ Pass | layout.tsx wraps children in MainLayout → MaxContainer |
| Footer | `border-t border-white/5 py-12`, `text-xs text-slate-500` links | ✅ Pass | Footer.tsx; links inherit text-slate-500, hover:text-emerald-400 |

**Discrepancy fixed:** `.max-container` now includes `lg:px-20`.

**Terms & Privacy:** Both used a second `MaxContainer` with `py-16 md:py-24`, causing double horizontal padding and non-standard vertical spacing. **Fixed:** Removed inner MaxContainer; pages now render a single `div` with `max-w-3xl` so only MainLayout’s MaxContainer (with standard `py-20 md:py-24 lg:py-32`) applies.

---

## 3. Global Styles (globals.css)

| Check | Spec | Status | Notes |
|-------|------|--------|--------|
| Body background | Radial gradient `from-slate-900 via-black to-black` | ✅ Pass | Applied in layout.tsx body className, not in globals (correct). |
| `.max-container` | `max-w-[1440px]`, `px-6 md:px-12` | ✅ Pass | Now also `lg:px-20` (see above). |
| Scrollbar track | `rgba(15, 23, 42, 0.5)` | ✅ Pass | Line 91 |
| Scrollbar thumb | `rgba(148, 163, 184, 0.3)`, radius 4px | ✅ Pass | Lines 94–95 |
| Scrollbar thumb hover | `rgba(148, 163, 184, 0.5)` | ✅ Pass | Line 98 |

**globals.css: No remaining discrepancies.**

---

## 4. Component Base Classes

### ChaotixCard

| Check | Spec | Status | Notes |
|-------|------|--------|--------|
| Container | `rounded-2xl border border-white/5 bg-slate-900/40 p-10` | ✅ Pass | ChaotixCard.tsx line 23 |
| Hover | `hover:border-emerald-500/20` | ✅ Pass | Line 24 |
| Focus-within | (optional) | ✅ Pass | `focus-within:border-emerald-500/20` present |

**ChaotixCard: No discrepancies.**

---

### ChaotixButton

| Check | Spec | Status | Notes |
|-------|------|--------|--------|
| Primary variant | `bg-emerald-500`, `hover:bg-emerald-400`, focus ring | ✅ Pass | variants.primary |
| Secondary variant | `border-white/10`, `bg-black/40`, hover border/text | ✅ Pass | variants.secondary |
| Ghost variant | `text-slate-500`, `hover:bg-white/5 hover:text-white` | ✅ Pass | variants.ghost |
| Base height | Design system: 52px (`h-13`) for primary buttons | 🔧 Fixed | **Was `h-11` (44px).** Updated base to `h-13 min-h-[3.25rem]` to match design system (01). |

**Discrepancy fixed:** ChaotixButton base height aligned to 52px (h-13).

---

### Input

| Check | Spec | Status | Notes |
|-------|------|--------|--------|
| Height | `h-13` (52px) | ✅ Pass | `hStandard = "h-13"` |
| Wrapper | `rounded-xl`, `border-white/10` | ✅ Pass | Line 26 |
| Focus | `focus-within:border-emerald-500/50`, ring | ✅ Pass | Line 27: `focus-within:ring-1 focus-within:ring-emerald-500/20` |

**Input: No discrepancies.**

---

## Summary of Fixes Applied

1. **globals.css** — Added `lg:px-20` to `.max-container` so it matches the comment in MaxContainer.tsx and design doc 02.
2. **ChaotixButton.tsx** — Changed base from `h-11 min-h-[2.75rem]` to `h-13 min-h-[3.25rem]` for 52px standard height.
3. **terms/page.tsx** — Removed inner `MaxContainer`; page uses a single `div` with `max-w-3xl` so layout and padding come from MainLayout only.
4. **privacy/page.tsx** — Same as terms: removed inner MaxContainer, use single `div` with `max-w-3xl`.

---

## Compliance Summary

| Area | Result |
|------|--------|
| Header | ✅ Fully compliant |
| MaxContainer & MainLayout | ✅ Compliant after fixes |
| Footer | ✅ Compliant |
| globals.css | ✅ Compliant after fix |
| ChaotixCard | ✅ Compliant |
| ChaotixButton | ✅ Compliant after fix |
| Input | ✅ Compliant |

All items from the audit (sections 1–4) are now satisfied.
