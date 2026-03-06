# Chaotix UI Reference for AI

**Purpose:** Upload this folder to an AI (e.g. Claude, ChatGPT, Cursor) so it understands how the Chaotix site looks and behaves. The AI can then suggest **concrete UI fixes** and **prompts** you can use to implement them.

## What's in this folder

| File | Contents |
|------|----------|
| **01-design-system.md** | Colors, typography, spacing, borders, shadows, animations |
| **02-layout-and-structure.md** | Page shell, header, footer, containers, vertical rhythm |
| **03-components-and-patterns.md** | Cards, buttons, inputs, modals, dropdowns, search |
| **04-pages-overview.md** | Main routes and what each page shows |
| **05-file-map.md** | Where to edit: which file to change for what |
| **06-sample-prompts.md** | Example prompts for fixing UI (for you or the AI) |

## How to use

1. **Upload this folder** (or paste the contents) into your AI tool when asking for UI help.
2. **Reference it** in your prompt, e.g.: "Using the UI reference in docs/ai-ui-reference, make the profile stats use ChaotixCard and match the design system."
3. **Use the sample prompts** in `06-sample-prompts.md` as starting points for fixes.

## Tech stack (relevant to UI)

- **Next.js 14** (App Router), **React 18**, **TypeScript**
- **Tailwind CSS** for styling (no separate CSS framework)
- **Framer Motion** for animations
- **Lucide React** for icons
- Global styles: **`src/app/globals.css`**  
- Tailwind config: **`tailwind.config.ts`** (project root)
- Components: **`src/components/`** and **`src/app/**/`** (page-specific)

## One-line summary for the AI

*Chaotix is a dark-themed prediction-market app (Aether design): obsidian/slate background, emerald accents, 1440px max container, h-20 header with blur, ChaotixCard/ChaotixButton/Input (h-13), border-white/10 and focus ring emerald-500. Use the docs in this folder to match the existing look when suggesting UI changes.*
