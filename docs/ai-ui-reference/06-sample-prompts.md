# 06 — Sample Prompts for UI Fixes

Copy or adapt these when asking an AI (or a developer) to fix or align UI. Assume the AI has read the other docs in this folder.

---

**Make a section use the design system**
- "Wrap this section in ChaotixCard and use the Aether spacing (p-10, gap-y-12). See docs/ai-ui-reference."
- "Use ChaotixButton primary for the main CTA and ChaotixButton secondary for the secondary action. Match the design system in docs/ai-ui-reference."

**Align inputs and buttons**
- "Use the Input component from src/components/ui/Input.tsx for this field (h-13, border-white/10, focus ring). Add leftIcon with IconWrapper if there's an icon."
- "Make all primary buttons h-13 and use bg-emerald-500 hover:bg-emerald-400 with focus-visible:ring-2 ring-emerald-500/60 ring-offset-black."

**Header / layout**
- "Keep the header h-20 with backdrop-blur-xl and border-white/5. Don't change the MaxContainer or main padding."
- "This page should sit inside the existing MainLayout; only change the inner content to use max-w-3xl and the section spacing from the design system."

**Colors and borders**
- "Use border-white/10 for this panel and hover:border-emerald-500/20. Background should be bg-slate-900/40 or #0B0F1A."
- "Replace any custom green/red with design system: primary = emerald-500/400, danger = red-400 or chaos-danger."

**Cards and lists**
- "Render each item in a ChaotixCard with rounded-2xl and the standard padding. Use gap-4 or gap-6 between cards."
- "Match the MarketCard style: same border, bg, radius as ChaotixCard; use text-slate-100 for titles and text-slate-500 for secondary."

**Modals and dropdowns**
- "This modal should have the same overlay and panel style as the auth modal: dark overlay, rounded-2xl panel, border-white/10, close on overlay click."
- "The dropdown should be w-[280px], rounded-2xl, border-white/10, bg-[#0B0F1A], with nav items using the same hover style as the header dropdown."

**Typography**
- "Page title: font-semibold text-slate-100, clamp or text-3xl. Section headings: text-lg font-semibold text-slate-200. Body: text-slate-400 leading-relaxed."
- "Use the design system typography from 01-design-system.md — no random font sizes or colors."

**Responsive**
- "Keep the max-container (1440px) and use px-6 md:px-12. Stack the grid on mobile (grid-cols-1) and 2–4 cols on md/lg as in the rest of the site."

**Full pass**
- "Audit this page against docs/ai-ui-reference: use ChaotixCard/ChaotixButton/Input where appropriate, Aether colors and borders, h-13 for controls, and the same vertical rhythm (py-20, gap-y-12). List what you changed."
