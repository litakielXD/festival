import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#0b1020",
        card: "#141a2e",
        foreground: "#eef2ff",
        muted: "#9ca3af",
        accent: "#8b5cf6",
        success: "#22c55e",
        danger: "#ef4444"
      }
    }
  },
  plugins: []
};

export default config;
