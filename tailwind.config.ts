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
        background: "#d9e0ea",
        card: "#e8eef9",
        foreground: "#1f2a44",
        muted: "#5f6f8c",
        accent: "#4f73b8",
        success: "#22c55e",
        danger: "#ef4444"
      }
    }
  },
  plugins: []
};

export default config;
