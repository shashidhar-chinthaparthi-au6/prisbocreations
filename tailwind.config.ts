import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    screens: {
      xs: "320px",
      sm: "375px",
      md: "640px",
      lg: "1024px",
      xl: "1280px",
      "2xl": "1536px",
    },
    extend: {
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
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
        shimmer: "shimmer 1.4s infinite",
        "hero-marquee-l": "hero-marquee-l 55s linear infinite",
        "hero-marquee-r": "hero-marquee-r 62s linear infinite",
      },
      colors: {
        ink: { DEFAULT: "#18120e", muted: "#6b6258" },
        sand: { DEFAULT: "#fdfaf6", deep: "#ece3d8" },
        accent: { DEFAULT: "#b5661a", light: "#faeee0", dark: "#8a4d12" },
        rose: { DEFAULT: "#9f1239", light: "#be185d" },
        copper: { DEFAULT: "#b5661a", dark: "#8a4d12", light: "#faeee0" },
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
