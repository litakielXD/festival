"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  saveFestivalBandRankingWithState,
  type FestivalRankingActionState
} from "@/lib/actions/festival-ranking";
import { removeFestivalBandGenre } from "@/lib/actions/festival-band-genres";
import {
  FestivalFavoriteButton,
  FestivalFavoritesFilterToggle
} from "@/components/festival-favorites-controls";
import { FestivalBandGenreAdd } from "@/components/festival-band-genre-add";
import { GenreBadge } from "@/components/genre-badge";
import { slotGenreAccentClass } from "@/lib/genre/normalize";
import { festivalFavoritesStorageKey } from "@/lib/favorites/storage-key";

interface BandItem {
  id: string;
  name: string;
  genres: string[];
  dayLabel: string | null;
  genreContributions: Array<{ id: string; genre: string; createdBy: string }>;
}

interface FestivalBandRankingBoardProps {
  festivalId: string;
  currentUserId: string;
  bands: BandItem[];
  initialOrder: string[];
}

const initialState: FestivalRankingActionState = { ok: false, message: "" };

export function FestivalBandRankingBoard({
  festivalId,
  currentUserId,
  bands,
  initialOrder
}: FestivalBandRankingBoardProps) {
  const [state, formAction, pending] = useActionState(
    saveFestivalBandRankingWithState,
    initialState
  );

  const storageKey = festivalFavoritesStorageKey(festivalId, currentUserId);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [genreOverrides, setGenreOverrides] = useState<Map<string, string[]>>(new Map());
  const [removingContributionId, setRemovingContributionId] = useState<string | null>(null);
  const [genreActionMessage, setGenreActionMessage] = useState("");

  const visibleBands = useMemo(() => {
    const mergedBands = bands.map((band) => ({
      ...band,
      genres: genreOverrides.get(band.id) ?? band.genres
    }));
    if (!favoritesOnly) return mergedBands;
    return mergedBands.filter((band) => favoriteIds.has(band.id));
  }, [bands, favoriteIds, favoritesOnly, genreOverrides]);

  const orderedInitial = useMemo(() => {
    const byId = new Map(visibleBands.map((band) => [band.id, band]));
    const inOrder = initialOrder.filter((id) => byId.has(id));
    const rest = visibleBands
      .map((band) => band.id)
      .filter((id) => !inOrder.includes(id));
    return [...inOrder, ...rest];
  }, [visibleBands, initialOrder]);

  const [order, setOrder] = useState<string[]>(orderedInitial);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const byId = useMemo(() => new Map(visibleBands.map((band) => [band.id, band])), [visibleBands]);

  useEffect(() => {
    setOrder(orderedInitial);
  }, [orderedInitial]);

  useEffect(() => {
    setGenreOverrides(new Map());
  }, [bands]);

  useEffect(() => {
    const sync = () => {
      try {
        const raw = window.localStorage.getItem(storageKey);
        const parsed = raw ? (JSON.parse(raw) as string[]) : [];
        setFavoriteIds(new Set(parsed));
      } catch {
        setFavoriteIds(new Set());
      }
      setFavoritesOnly(window.localStorage.getItem(`${storageKey}:mode`) === "favorites");
    };
    sync();
    const onChanged = (event: Event) => {
      const custom = event as CustomEvent<{ storageKey: string }>;
      if (custom.detail?.storageKey !== storageKey) return;
      sync();
    };
    window.addEventListener("festival-favorites-changed", onChanged);
    return () => window.removeEventListener("festival-favorites-changed", onChanged);
  }, [storageKey]);

  function move(dragId: string, targetId: string) {
    if (dragId === targetId) return;
    setOrder((prev) => {
      const from = prev.indexOf(dragId);
      const to = prev.indexOf(targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      next.splice(from, 1);
      next.splice(to, 0, dragId);
      return next;
    });
  }

  function moveByIndex(index: number, direction: -1 | 1) {
    setOrder((prev) => {
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const [current] = next.splice(index, 1);
      next.splice(targetIndex, 0, current);
      return next;
    });
  }

  return (
    <section className="festival-card p-4">
      <h2 className="mb-1 text-lg font-semibold">Mein Ranking (Drag and Drop + Buttons)</h2>
      <p className="mb-3 text-sm text-muted">
        Ziehe Bands nach oben/unten oder nutze die Pfeile, um deine Reihenfolge zu setzen.
      </p>
      <div className="mb-3">
        <FestivalFavoritesFilterToggle storageKey={storageKey} />
      </div>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="festivalId" value={festivalId} />
        <input type="hidden" name="orderedBandIds" value={JSON.stringify(order)} />
        <div className="space-y-2">
          {order.map((bandId, index) => {
            const band = byId.get(bandId);
            if (!band) return null;
            return (
              <article
                key={band.id}
                draggable
                onDragStart={() => setDraggedId(band.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (draggedId) move(draggedId, band.id);
                  setDraggedId(null);
                }}
                onDragEnd={() => setDraggedId(null)}
                className={`festival-card cursor-move p-3 ${slotGenreAccentClass(band.genres)}`}
              >
                <p className="font-medium">
                  #{index + 1} {band.name}
                </p>
                <p className="text-sm text-muted">
                  {band.dayLabel ?? "Unbekannter Tag"}
                  {band.genres.length ? ` | ${band.genres.join(" · ")}` : ""}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {band.genres.map((g) => (
                    <GenreBadge key={g} genre={g} />
                  ))}
                  <FestivalBandGenreAdd
                    festivalId={festivalId}
                    bandId={band.id}
                    mergedGenres={band.genres}
                    onGenreAdded={(genre) => {
                      const trimmed = genre.trim();
                      if (!trimmed) return;
                      setGenreOverrides((prev) => {
                        const current = prev.get(band.id) ?? band.genres;
                        const norm = (v: string) => v.trim().toLowerCase();
                        if (current.some((v) => norm(v) === norm(trimmed)) || current.length >= 3) return prev;
                        const next = new Map(prev);
                        next.set(band.id, [...current, trimmed]);
                        return next;
                      });
                    }}
                  />
                </div>
                {band.genreContributions.length ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {band.genreContributions.map((entry) => {
                      const removable = entry.createdBy === currentUserId;
                      return (
                        <span
                          key={entry.id}
                          className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[11px]"
                        >
                          {entry.genre}
                          {removable ? (
                            <button
                              type="button"
                              disabled={removingContributionId === entry.id}
                              onClick={async () => {
                                setGenreActionMessage("");
                                setRemovingContributionId(entry.id);
                                const res = await removeFestivalBandGenre({
                                  festivalId,
                                  bandId: band.id,
                                  contributionId: entry.id
                                });
                                setRemovingContributionId(null);
                                if (!res.ok) {
                                  setGenreActionMessage(res.message);
                                  return;
                                }
                                setGenreOverrides((prev) => {
                                  const current = prev.get(band.id) ?? band.genres;
                                  const norm = (v: string) => v.trim().toLowerCase();
                                  const idx = current.findIndex((v) => norm(v) === norm(entry.genre));
                                  if (idx < 0) return prev;
                                  const nextGenres = [...current];
                                  nextGenres.splice(idx, 1);
                                  const next = new Map(prev);
                                  next.set(band.id, nextGenres);
                                  return next;
                                });
                                setGenreActionMessage("Genre entfernt.");
                              }}
                              className="rounded border border-slate-300 px-1 text-[10px] hover:bg-slate-100 disabled:opacity-50"
                              aria-label={`Genre ${entry.genre} entfernen`}
                              title="Eigenen Eintrag entfernen"
                            >
                              ×
                            </button>
                          ) : null}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-2">
                  <FestivalFavoriteButton storageKey={storageKey} bandId={band.id} />
                  <button
                    type="button"
                    onClick={() => moveByIndex(index, -1)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
                    disabled={index === 0}
                  >
                    Nach oben
                  </button>
                  <button
                    type="button"
                    onClick={() => moveByIndex(index, 1)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-100 disabled:opacity-50"
                    disabled={index === order.length - 1}
                  >
                    Nach unten
                  </button>
                </div>
                {genreActionMessage ? <p className="mt-2 text-xs text-muted">{genreActionMessage}</p> : null}
              </article>
            );
          })}
        </div>
        {!order.length ? (
          <p className="text-sm text-muted">
            Keine Bands in dieser Ansicht. Waehle Alle Acts oder markiere Favoriten mit dem Herz.
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-60"
        >
          {pending ? "Speichere..." : "Ranking speichern"}
        </button>
        {state.message ? (
          <p className={`text-xs ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>
            {state.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
