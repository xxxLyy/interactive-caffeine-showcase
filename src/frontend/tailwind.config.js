import typography from "@tailwindcss/typography";
import containerQueries from "@tailwindcss/container-queries";
import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["index.html", "src/**/*.{js,ts,jsx,tsx,html,css}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "oklch(var(--border))",
        input: "oklch(var(--input))",
        ring: "oklch(var(--ring) / <alpha-value>)",
        background: "oklch(var(--background))",
        foreground: "oklch(var(--foreground))",
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "oklch(var(--destructive) / <alpha-value>)",
          foreground: "oklch(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "oklch(var(--popover))",
          foreground: "oklch(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "oklch(var(--card))",
          foreground: "oklch(var(--card-foreground))",
        },
        chart: {
          1: "oklch(var(--chart-1))",
          2: "oklch(var(--chart-2))",
          3: "oklch(var(--chart-3))",
          4: "oklch(var(--chart-4))",
          5: "oklch(var(--chart-5))",
        },
        sidebar: {
          DEFAULT: "oklch(var(--sidebar))",
          foreground: "oklch(var(--sidebar-foreground))",
          primary: "oklch(var(--sidebar-primary))",
          "primary-foreground": "oklch(var(--sidebar-primary-foreground))",
          accent: "oklch(var(--sidebar-accent))",
          "accent-foreground": "oklch(var(--sidebar-accent-foreground))",
          border: "oklch(var(--sidebar-border))",
          ring: "oklch(var(--sidebar-ring))",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0,0,0,0.05)",
        subtle: "0 1px 0 0 oklch(1 0 0 / 0.04) inset, 0 8px 24px -12px oklch(0 0 0 / 0.6)",
        elevated: "0 1px 0 0 oklch(1 0 0 / 0.06) inset, 0 24px 60px -20px oklch(0 0 0 / 0.75)",
        "key-lit": "0 0 0 1px oklch(var(--primary) / 0.7), 0 -12px 32px -8px oklch(var(--primary) / 0.55)",
        "ring-halo": "0 0 0 1px oklch(var(--accent) / 0.5), 0 0 40px -6px oklch(var(--accent) / 0.45)",
      },
      transitionTimingFunction: {
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "in-out-quint": "cubic-bezier(0.83, 0, 0.17, 1)",
      },
      keyframes: {
        "char-rise": {
          "0%": { opacity: "0", transform: "translateY(0.6em) rotate(4deg)", filter: "blur(8px)" },
          "100%": { opacity: "1", transform: "translateY(0) rotate(0)", filter: "blur(0)" },
        },
        "halo-pulse": {
          "0%, 100%": { transform: "scale(1)", opacity: "0.55" },
          "50%": { transform: "scale(1.18)", opacity: "0" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scan-blink": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        breathe: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "judge-pop": {
          "0%": { opacity: "0", transform: "scale(0.6)", filter: "blur(6px)" },
          "25%": { opacity: "1", transform: "scale(1.12)", filter: "blur(0)" },
          "45%": { transform: "scale(1)" },
          "100%": { opacity: "0", transform: "translateY(-28px) scale(0.96)" },
        },
        "count-in": {
          "0%": { opacity: "0", transform: "scale(2.2)", filter: "blur(12px)" },
          "35%": { opacity: "1", transform: "scale(1)", filter: "blur(0)" },
          "80%": { opacity: "1", transform: "scale(0.92)" },
          "100%": { opacity: "0", transform: "scale(0.7)", filter: "blur(4px)" },
        },
        "combo-bump": {
          "0%": { transform: "scale(1)" },
          "30%": { transform: "scale(1.18)" },
          "100%": { transform: "scale(1)" },
        },
        "ring-shrink": {
          "0%": { transform: "scale(2.6)", opacity: "0" },
          "15%": { opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "eq-bar": {
          "0%, 100%": { transform: "scaleY(0.25)" },
          "50%": { transform: "scaleY(1)" },
        },
        "rank-slam": {
          "0%": { opacity: "0", transform: "scale(3) rotate(-8deg)", filter: "blur(16px)" },
          "60%": { opacity: "1", transform: "scale(0.94) rotate(0)", filter: "blur(0)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(0)" },
        },
        "miss-shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-5px)" },
          "50%": { transform: "translateX(4px)" },
          "75%": { transform: "translateX(-2px)" },
        },
        "dash-march": {
          "0%": { backgroundPosition: "0 0, 0 100%, 0 0, 100% 0" },
          "100%": { backgroundPosition: "20px 0, -20px 100%, 0 -20px, 100% 20px" },
        },
        "analysis-sweep": {
          "0%": { backgroundPosition: "120% 0" },
          "100%": { backgroundPosition: "-120% 0" },
        },
        "step-tick": {
          "0%": { transform: "scale(0.4)", opacity: "0.4" },
          "55%": { transform: "scale(1.35)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "wave-rise": {
          "0%": { transform: "scaleY(0.08)", opacity: "0.3" },
          "100%": { transform: "scaleY(1)", opacity: "1" },
        },
        "card-reveal": {
          "0%": { opacity: "0", transform: "translateY(18px) scale(0.98)", filter: "blur(10px)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)", filter: "blur(0)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "char-rise": "char-rise 1.1s cubic-bezier(0.16, 1, 0.3, 1) both",
        "halo-pulse": "halo-pulse 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite",
        "fade-up": "fade-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
        "scan-blink": "scan-blink 1.2s ease-in-out infinite",
        breathe: "breathe 4s ease-in-out infinite",
        "judge-pop": "judge-pop 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",
        "count-in": "count-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) both",
        "combo-bump": "combo-bump 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "ring-shrink": "ring-shrink var(--ring-duration, 1.2s) linear both",
        "eq-bar": "eq-bar 0.9s ease-in-out infinite",
        "rank-slam": "rank-slam 0.9s cubic-bezier(0.16, 1, 0.3, 1) both",
        "miss-shake": "miss-shake 0.3s cubic-bezier(0.83, 0, 0.17, 1)",
        "dash-march": "dash-march 0.9s linear infinite",
        "analysis-sweep": "analysis-sweep 1.6s cubic-bezier(0.83, 0, 0.17, 1) infinite",
        "step-tick": "step-tick 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "wave-rise": "wave-rise 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "card-reveal": "card-reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) both",
      },
    },
  },
  plugins: [typography, containerQueries, animate],
};
