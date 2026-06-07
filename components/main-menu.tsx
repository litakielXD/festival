"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut } from "@/lib/actions/auth";

interface MainMenuProps {
  isAdmin: boolean;
}

export function MainMenu({ isAdmin }: MainMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Menue oeffnen"
        className="inline-flex h-10 w-10 flex-col items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="block h-0.5 w-5 bg-foreground" />
        <span className="block h-0.5 w-5 bg-foreground" />
        <span className="block h-0.5 w-5 bg-foreground" />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <nav className="absolute left-0 z-20 mt-2 min-w-52 rounded-xl border border-slate-200 bg-card p-1.5 shadow-xl dark:border-slate-700">
            <Link className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" href="/dashboard/profile" onClick={() => setOpen(false)}>
              👤 Profil
            </Link>
            <Link className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" href="/dashboard/festivals" onClick={() => setOpen(false)}>
              🎪 Festivals
            </Link>
            {isAdmin ? (
              <Link className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800" href="/dashboard/admin" onClick={() => setOpen(false)}>
                ⚙️ Adminbereich
              </Link>
            ) : null}
            <div className="my-1 border-t border-slate-200 dark:border-slate-700" />
            <form action={signOut} className="md:hidden">
              <button type="submit" className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30">
                🚪 Logout
              </button>
            </form>
          </nav>
        </>
      ) : null}
    </div>
  );
}
