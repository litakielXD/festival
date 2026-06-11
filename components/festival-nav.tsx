"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface FestivalNavProps {
  festivalId: string;
}

export function FestivalNav({ festivalId }: FestivalNavProps) {
  const pathname = usePathname();
  const base = `/dashboard/festivals/${festivalId}`;
  
  const items = [
    { href: base, label: "Mitglieder" },
    { href: `${base}/timeline`, label: "Timeline" },
    { href: `${base}/bands`, label: "Ranking" },
    { href: `${base}/notes`, label: "Hausaufgaben" }
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="mb-6 hidden gap-3 text-sm md:flex">
        {items.map((item) => {
          // A tab is active if it exactly matches the path, or (for subpages) starts with the href
          const isActive = item.href === base ? pathname === base : pathname.startsWith(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`festival-tab-link festival-button-tactile inline-flex items-center justify-center font-medium ${
                isActive ? "festival-tab-link-active" : "festival-tab-link-idle"
              }`}
            >
              {item.label === "Mitglieder" ? "Chat & Mitglieder" : item.label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-safe-bottom pt-2 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:hidden shadow-lg">
        <div className="mx-auto grid max-w-6xl grid-cols-4">
          {items.map((item) => {
            const isActive = item.href === base ? pathname === base : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center font-semibold transition-all duration-150 active:scale-[0.97] ${
                  isActive
                    ? "bg-indigo-50 text-indigo-900 border border-indigo-200/50 dark:bg-indigo-950/40 dark:text-indigo-200 dark:border-indigo-900/40"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <span className="text-base leading-none">
                  {item.label === "Mitglieder" ? "💬" : item.label === "Timeline" ? "📅" : item.label === "Ranking" ? "🏆" : "📝"}
                </span>
                <span className="text-[11px] leading-tight tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
