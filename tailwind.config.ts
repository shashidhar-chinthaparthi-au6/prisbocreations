import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        "hero-marquee-l": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "hero-marquee-r": {
          "0%": { transform: "translateX(-50%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        "hero-marquee-l": "hero-marquee-l 55s linear infinite",
        "hero-marquee-r": "hero-marquee-r 62s linear infinite",
      },
      colors: {
        ink: { DEFAULT: "#1a1a1a", muted: "#6b6560" },
        sand: { DEFAULT: "#fdfaf7", deep: "#e8e0d6" },
        accent: { DEFAULT: "#c47a2b", light: "#f5e6d0" },
        rose: { DEFAULT: "#9f1239", light: "#be185d" },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [typography],
};

export default config;
