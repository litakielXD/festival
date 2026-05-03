"use client";

import Link from "next/link";
import { useState } from "react";

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
        className="rounded-md border border-slate-300 bg-slate-100 p-2 hover:bg-slate-200"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="block h-0.5 w-5 bg-foreground" />
        <span className="mt-1 block h-0.5 w-5 bg-foreground" />
        <span className="mt-1 block h-0.5 w-5 bg-foreground" />
      </button>

      {open ? (
        <nav className="absolute right-0 z-20 mt-2 min-w-52 rounded-md border border-slate-300 bg-card p-2 shadow-lg">
          <Link className="block rounded px-3 py-2 text-sm hover:bg-slate-100" href="/dashboard/profile" onClick={() => setOpen(false)}>
            Profil
          </Link>
          <Link className="block rounded px-3 py-2 text-sm hover:bg-slate-100" href="/dashboard/festivals" onClick={() => setOpen(false)}>
            Festivals
          </Link>
          {isAdmin ? (
            <Link className="block rounded px-3 py-2 text-sm hover:bg-slate-100" href="/dashboard/admin" onClick={() => setOpen(false)}>
              Adminbereich
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
