import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--tw-color-bg) / <alpha-value>)",
        card:       "rgb(var(--tw-color-card) / <alpha-value>)",
        foreground: "rgb(var(--tw-color-fg) / <alpha-value>)",
        muted:      "rgb(var(--tw-color-muted) / <alpha-value>)",
        accent:     "rgb(var(--tw-color-accent) / <alpha-value>)",
        success:    "#22c55e",
        danger:     "#ef4444"
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
