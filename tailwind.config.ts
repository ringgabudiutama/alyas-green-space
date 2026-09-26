import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Emerald / forest green utama
        brand: {
          50: "#f1f8f4",
          100: "#dcefe3",
          200: "#bfe0cc",
          300: "#93c9aa",
          400: "#62ab83",
          500: "#3f8f66",
          600: "#2e7351",
          700: "#265c43",
          800: "#214a38",
          900: "#1c3d2f",
          950: "#0e231a",
        },
        forest: { 700: "#245a44", 800: "#1d4536", 900: "#16352b" },
        sage: { 100: "#e8ede4", 200: "#d3dccb", 300: "#b5c4a8", 400: "#97ab86", 500: "#7a9168" },
        mint: { 50: "#f2fbf6", 100: "#e6f6ee", 200: "#c9ecd9", 300: "#a3dcbf" },
        cream: { 50: "#fdfbf5", 100: "#f8f4ea", 200: "#efe8d6" },
        night: { 900: "#0f1d17", 800: "#152820", 700: "#1b3229", 600: "#21392e", 500: "#2d4a3d" },
        amberSoft: { 500: "#c98a1a", 600: "#a86f10" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "ui-serif", "Georgia", "serif"],
      },
      borderRadius: { "2xl": "1.25rem", "3xl": "1.75rem" },
      boxShadow: {
        soft: "0 2px 12px -2px rgba(28, 61, 47, 0.08), 0 1px 3px rgba(28, 61, 47, 0.05)",
        lift: "0 10px 30px -8px rgba(28, 61, 47, 0.18)",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(-3px) scale(1.015)" },
        },
        blink: { "0%, 92%, 100%": { transform: "scaleY(1)" }, "95%": { transform: "scaleY(0.1)" } },
        fadeUp: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        pop: { "0%": { transform: "scale(0.9)", opacity: "0" }, "60%": { transform: "scale(1.04)" }, "100%": { transform: "scale(1)", opacity: "1" } },
        ring: { "0%,100%": { transform: "rotate(0)" }, "20%": { transform: "rotate(14deg)" }, "40%": { transform: "rotate(-10deg)" }, "60%": { transform: "rotate(6deg)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        floatUp: { "0%": { transform: "translateY(0) rotate(0)", opacity: "1" }, "100%": { transform: "translateY(-120px) rotate(200deg)", opacity: "0" } },
      },
      animation: {
        breathe: "breathe 4.5s ease-in-out infinite",
        blink: "blink 5s infinite",
        "fade-up": "fadeUp .45s ease-out both",
        pop: "pop .4s ease-out both",
        ring: "ring .8s ease-in-out",
        shimmer: "shimmer 1.4s infinite",
        "float-up": "floatUp 1.6s ease-out forwards",
      },
    },
  },
  plugins: [],
};

export default config;
