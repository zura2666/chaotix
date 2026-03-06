import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      spacing: {
        "18": "4.5rem",
        "13": "3.25rem", /* 52px */
      },
      maxWidth: {
        "main": "1440px",
      },
      colors: {
        chaos: {
          bg: "#0a0a0f",
          /** Deepest obsidian – page background */
          page: "#020617",
          /** Soft radial glow behind content */
          glow: "#1e293b",
          section: "#111827",
          card: "#12121a",
          border: "#1e1e2e",
          muted: "#6b7280",
          neon: "#00ff9d",
          neonPink: "#ff006e",
          neonBlue: "#00d4ff",
          neonPurple: "#bf00ff",
          /** Primary: success / positive actions */
          emerald: "#10b981",
          /** Danger / negative actions (rose) */
          danger: "#f43f5e",
          /** Trading chart down / sell / loss – pinkish red */
          tradeDown: "#f43f5e",
          aether: {
            danger: "#f43f5e",
          },
          charcoal: "#0f0f0f",
          "charcoal-800": "#1a1a1a",
          "charcoal-700": "#262626",
          navy: "#0f172a",
          "navy-light": "#1e293b",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      animation: {
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "float": "float 6s ease-in-out infinite",
        "fade-in": "fade-in 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.25s ease-out",
      },
      keyframes: {
        "glow-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      boxShadow: {
        neon: "0 0 20px rgba(0, 255, 157, 0.3)",
        "neon-pink": "0 0 20px rgba(255, 0, 110, 0.3)",
        glass: "0 8px 32px rgba(0,0,0,0.4)",
        "emerald-glow": "0 0 20px rgba(16, 185, 129, 0.35)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
