"use client";

import { useEffect, useState } from "react";

type Accent = "fresh" | "warm";

export function AccentToggle() {
  const [accent, setAccent] = useState<Accent>("fresh");

  useEffect(() => {
    const stored = localStorage.getItem("accent");
    if (stored === "warm") setAccent("warm");
  }, []);

  const toggle = () => {
    const next: Accent = accent === "fresh" ? "warm" : "fresh";
    setAccent(next);
    if (next === "warm") {
      document.documentElement.classList.add("accent-warm");
      localStorage.setItem("accent", "warm");
    } else {
      document.documentElement.classList.remove("accent-warm");
      localStorage.setItem("accent", "fresh");
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="festival-button-tactile inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-3 text-xs font-semibold hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-sm"
      aria-label={accent === "fresh" ? "Zu Warm wechseln" : "Zu Fresh wechseln"}
      title={accent === "fresh" ? "Warm-Palette aktivieren" : "Fresh-Palette aktivieren"}
    >
      <span>{accent === "fresh" ? "🌿" : "🍂"}</span>
      <span className="hidden sm:inline">{accent === "fresh" ? "Fresh" : "Warm"}</span>
    </button>
  );
}
