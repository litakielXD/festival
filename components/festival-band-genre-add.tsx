"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addFestivalBandGenre } from "@/lib/actions/festival-band-genres";
import { toast } from "@/components/ui/toast";

export function FestivalBandGenreAdd({
  festivalId,
  bandId,
  mergedGenres,
  compact,
  onGenreAdded
}: {
  festivalId: string;
  bandId: string;
  mergedGenres: string[];
  compact?: boolean;
  onGenreAdded?: (genre: string) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [genre, setGenre] = useState("");
  const [pending, startTransition] = useTransition();
  const atMax = mergedGenres.length >= 3;
  const countLabel = `${mergedGenres.length}/3`;

  function submit() {
    const t = genre.trim();
    if (!t) return;
    startTransition(async () => {
      try {
        const r = await addFestivalBandGenre({ festivalId, bandId, genre: t });
        if (r.ok) {
          setGenre("");
          setOpen(false);
          onGenreAdded?.(t);
          toast.success(`Genre "${t}" hinzugefügt!`);
          router.refresh();
        } else {
          toast.error(r.message || "Genre konnte nicht hinzugefügt werden.");
        }
      } catch {
        toast.error("Speichern fehlgeschlagen. Bitte Verbindung prüfen und erneut versuchen.");
      }
    });
  }

  if (atMax) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="rounded border border-slate-300 bg-slate-50 dark:bg-slate-800 dark:border-slate-600 px-1.5 py-0.5 text-[11px] text-muted">{countLabel}</span>
        <button
          type="button"
          disabled
          title="Maximal 3 Genres erreicht"
          className={`rounded-md border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-2 py-1 text-sm text-muted opacity-60 ${
            compact ? "min-h-9 min-w-9" : ""
          }`}
          aria-label="Maximal 3 Genres erreicht"
        >
          +
        </button>
      </span>
    );
  }

  if (!open) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="rounded border border-slate-300 bg-slate-50 dark:bg-slate-800 dark:border-slate-600 px-1.5 py-0.5 text-[11px] text-muted">{countLabel}</span>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
          }}
          title="Genre hinzufügen"
          className={`rounded-md border border-dashed border-slate-400 dark:border-slate-500 bg-white dark:bg-slate-800 px-2 py-1 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 ${
            compact ? "min-h-9 min-w-9" : ""
          }`}
          aria-label="Genre hinzufügen"
        >
          +
        </button>
      </span>
    );
  }

  return (
    <span className={`inline-flex flex-wrap items-center gap-1 ${compact ? "max-w-full" : ""}`}>
      <span className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[11px] text-muted">{countLabel}</span>
      <input
        type="text"
        value={genre}
        onChange={(e) => setGenre(e.target.value)}
        maxLength={48}
        placeholder="Genre"
        disabled={pending}
        className="min-w-[6rem] max-w-[10rem] rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-2 py-1 text-xs"
        aria-label="Neues Genre"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") {
            setOpen(false);
            setGenre("");
          }
        }}
      />
      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className="rounded border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-2 py-1 text-xs hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50"
      >
        {pending ? "…" : "OK"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setOpen(false);
          setGenre("");
        }}
        className="rounded border border-transparent px-1 py-1 text-xs text-muted hover:underline"
      >
        Abbrechen
      </button>
    </span>
  );
}
