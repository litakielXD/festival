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
    { href: `${base}/notes`, label: "Notizen" }
  ];

  return (
    <>
      <nav className="mb-6 hidden gap-3 text-sm md:flex">
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md border px-3 py-2 ${
                isActive
                  ? "border-accent bg-accent/20 font-semibold text-foreground"
                  : "border-slate-300 hover:bg-slate-100"
              }`}
            >
              {item.label === "Mitglieder" ? "Mitglieder & Nachrichten" : item.label}
            </Link>
          );
        })}
      </nav>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-300 bg-card/95 px-2 pb-2 pt-2 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-4 gap-2">
          {items.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-2 py-2 text-center text-xs ${
                  isActive ? "bg-accent/20 font-semibold text-foreground" : "text-muted hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
