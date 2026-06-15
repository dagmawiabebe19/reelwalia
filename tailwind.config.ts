import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: {
          bg: "#000000",
          red: "#E03C2F",
          "red-hover": "#C93428",
          card: "rgba(255,255,255,0.08)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        streaming: "0.06em",
      },
      boxShadow: {
        "card-hover": "0 12px 40px rgba(0, 0, 0, 0.55)",
        "hero-vignette": "0 8px 40px rgba(0, 0, 0, 0.45)",
      },
      keyframes: {
        "subscribe-fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "subscribe-slide-up": {
          from: { transform: "translateY(100%)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "subscribe-fade-in": "subscribe-fade-in 0.35s ease-out",
        "subscribe-slide-up": "subscribe-slide-up 0.35s ease-out",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};

export default config;
