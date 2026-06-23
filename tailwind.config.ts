import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        surface: "rgb(var(--surface) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT: "rgb(var(--success) / <alpha-value>)",
          soft: "rgb(var(--success-soft) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "rgb(var(--warning) / <alpha-value>)",
          soft: "rgb(var(--warning-soft) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "rgb(var(--danger) / <alpha-value>)",
          soft: "rgb(var(--danger-soft) / <alpha-value>)",
        },
        duplicate: {
          DEFAULT: "rgb(var(--duplicate) / <alpha-value>)",
          soft: "rgb(var(--duplicate-soft) / <alpha-value>)",
        },
        // CRM pipeline status colors (distinct from the LC-match semantic
        // colors above, even where a hue is shared) — see lib/status.ts.
        pipeline: {
          gray: { DEFAULT: "rgb(var(--pipeline-gray) / <alpha-value>)", soft: "rgb(var(--pipeline-gray-soft) / <alpha-value>)" },
          yellow: { DEFAULT: "rgb(var(--pipeline-yellow) / <alpha-value>)", soft: "rgb(var(--pipeline-yellow-soft) / <alpha-value>)" },
          blue: { DEFAULT: "rgb(var(--pipeline-blue) / <alpha-value>)", soft: "rgb(var(--pipeline-blue-soft) / <alpha-value>)" },
          orange: { DEFAULT: "rgb(var(--pipeline-orange) / <alpha-value>)", soft: "rgb(var(--pipeline-orange-soft) / <alpha-value>)" },
          teal: { DEFAULT: "rgb(var(--pipeline-teal) / <alpha-value>)", soft: "rgb(var(--pipeline-teal-soft) / <alpha-value>)" },
          green: { DEFAULT: "rgb(var(--pipeline-green) / <alpha-value>)", soft: "rgb(var(--pipeline-green-soft) / <alpha-value>)" },
          red: { DEFAULT: "rgb(var(--pipeline-red) / <alpha-value>)", soft: "rgb(var(--pipeline-red-soft) / <alpha-value>)" },
          purple: { DEFAULT: "rgb(var(--pipeline-purple) / <alpha-value>)", soft: "rgb(var(--pipeline-purple-soft) / <alpha-value>)" },
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(20 23 31 / 0.04), 0 1px 1px 0 rgb(20 23 31 / 0.03)",
        popover: "0 12px 32px -8px rgb(20 23 31 / 0.18), 0 2px 8px -2px rgb(20 23 31 / 0.08)",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(2px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.6s ease-in-out infinite",
        "fade-in": "fade-in 0.18s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
