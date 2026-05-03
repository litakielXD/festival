"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { addFestivalBandGenre } from "@/lib/actions/festival-band-genres";

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
  const [msg, setMsg] = useState("");
  const [msgTone, setMsgTone] = useState<"error" | "success">("error");
  const [toast, setToast] = useState("");
  const [pending, startTransition] = useTransition();
  const atMax = mergedGenres.length >= 3;
  const countLabel = `${mergedGenres.length}/3`;

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function submit() {
    setMsg("");
    setMsgTone("error");
    const t = genre.trim();
    if (!t) return;
    startTransition(async () => {
      try {
        const r = await addFestivalBandGenre({ festivalId, bandId, genre: t });
        if (r.ok) {
          setGenre("");
          setOpen(false);
          onGenreAdded?.(t);
          setMsg("Genre hinzugefügt.");
          setMsgTone("success");
          setToast("Genre hinzugefügt");
          router.refresh();
        } else {
          setMsg(r.message);
          setMsgTone("error");
        }
      } catch {
        setMsg("Speichern fehlgeschlagen. Bitte Verbindung zu Supabase prüfen und erneut versuchen.");
        setMsgTone("error");
      }
    });
  }

  if (atMax) {
    return (
      <span className="inline-flex items-center gap-1">
        <span className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[11px] text-muted">{countLabel}</span>
        <button
          type="button"
          disabled
          title="Maximal 3 Genres erreicht"
          className={`rounded-md border border-dashed border-slate-300 bg-slate-50 px-2 py-1 text-sm text-muted opacity-60 ${
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
        <span className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[11px] text-muted">{countLabel}</span>
        <button
          type="button"
          onClick={() => {
            setMsg("");
            setMsgTone("error");
            setOpen(true);
          }}
          title="Genre hinzufügen"
          className={`rounded-md border border-dashed border-slate-400 bg-white px-2 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 ${
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
        className="min-w-[6rem] max-w-[10rem] rounded border border-slate-300 px-2 py-1 text-xs"
        aria-label="Neues Genre"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
          if (e.key === "Escape") {
            setOpen(false);
            setMsg("");
            setMsgTone("error");
            setGenre("");
          }
        }}
      />
      <button
        type="button"
        disabled={pending}
        onClick={submit}
        className="rounded border border-slate-300 bg-slate-100 px-2 py-1 text-xs hover:bg-slate-200 disabled:opacity-50"
      >
        {pending ? "…" : "OK"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setOpen(false);
          setMsg("");
          setMsgTone("error");
          setGenre("");
        }}
        className="rounded border border-transparent px-1 py-1 text-xs text-muted hover:underline"
      >
        Abbrechen
      </button>
      {msg ? (
        <span className={`basis-full text-xs ${msgTone === "success" ? "text-emerald-700" : "text-rose-600"}`} role="alert">
          {msg}
        </span>
      ) : null}
      {toast ? (
        <span className="fixed bottom-4 right-4 z-[60] rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 shadow-md">
          {toast}
        </span>
      ) : null}
    </span>
  );
}
