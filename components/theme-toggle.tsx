"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Determine initial theme on mount
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="festival-button-tactile inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-sm hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-sm"
      aria-label={theme === "light" ? "Dunkelmodus aktivieren" : "Hellmodus aktivieren"}
      title={theme === "light" ? "Dunkelmodus aktivieren" : "Hellmodus aktivieren"}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
