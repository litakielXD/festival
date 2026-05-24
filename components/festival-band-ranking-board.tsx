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

  // Search and genre filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  // Compute all unique genres available in the bands of this day
  const allGenres = useMemo(() => {
    const set = new Set<string>();
    bands.forEach((band) => {
      const currentGenres = genreOverrides.get(band.id) ?? band.genres;
      currentGenres.forEach((g) => {
        const trimmed = g.trim();
        if (trimmed) set.add(trimmed);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "de-DE"));
  }, [bands, genreOverrides]);

  // Master ordering state containing all band IDs for the day (not just visible ones)
  const orderedInitial = useMemo(() => {
    const byId = new Map(bands.map((band) => [band.id, band]));
    const inOrder = initialOrder.filter((id) => byId.has(id));
    const rest = bands
      .map((band) => band.id)
      .filter((id) => !inOrder.includes(id));
    return [...inOrder, ...rest];
  }, [bands, initialOrder]);

  const [order, setOrder] = useState<string[]>(orderedInitial);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Map containing all band items resolved with their overrides
  const byId = useMemo(() => {
    const list = bands.map((band) => ({
      ...band,
      genres: genreOverrides.get(band.id) ?? band.genres
    }));
    return new Map(list.map((band) => [band.id, band]));
  }, [bands, genreOverrides]);

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

  // Filter bands based on search query, selected genre, and favorites
  const visibleBands = useMemo(() => {
    let list = bands.map((band) => ({
      ...band,
      genres: genreOverrides.get(band.id) ?? band.genres
    }));

    if (favoritesOnly) {
      list = list.filter((band) => favoriteIds.has(band.id));
    }

    if (selectedGenre) {
      list = list.filter((band) =>
        band.genres.some((g) => g.trim().toLowerCase() === selectedGenre.toLowerCase())
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter(
        (band) =>
          band.name.toLowerCase().includes(query) ||
          band.genres.some((g) => g.toLowerCase().includes(query))
      );
    }

    return list;
  }, [bands, favoriteIds, favoritesOnly, genreOverrides, selectedGenre, searchQuery]);

  // Sub-array of order containing only visible band IDs
  const visibleIds = useMemo(() => {
    const visibleSet = new Set(visibleBands.map((b) => b.id));
    return order.filter((id) => visibleSet.has(id));
  }, [visibleBands, order]);

  // Swapping two elements in the master order array
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

  // Swap with the next or previous visible band in the master order array
  function moveVisible(bandId: string, direction: -1 | 1) {
    setOrder((prev) => {
      const fromIndex = prev.indexOf(bandId);
      if (fromIndex < 0) return prev;

      const visibleSet = new Set(visibleIds);
      let targetIndex = -1;

      if (direction === -1) {
        // Find previous visible band in order
        for (let i = fromIndex - 1; i >= 0; i--) {
          if (visibleSet.has(prev[i])) {
            targetIndex = i;
            break;
          }
        }
      } else {
        // Find next visible band in order
        for (let i = fromIndex + 1; i < prev.length; i++) {
          if (visibleSet.has(prev[i])) {
            targetIndex = i;
            break;
          }
        }
      }

      if (targetIndex === -1) return prev; // nowhere to move

      const next = [...prev];
      const temp = next[fromIndex];
      next[fromIndex] = next[targetIndex];
      next[targetIndex] = temp;
      return next;
    });
  }

  const isFiltered = searchQuery.trim() || selectedGenre || favoritesOnly;

  return (
    <section className="festival-card p-4 space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Mein Ranking (Drag and Drop + Buttons)</h2>
        <p className="text-sm text-muted">
          Ziehe Bands nach oben/unten oder nutze die Pfeile, um deine Reihenfolge zu setzen.
        </p>
      </div>

      {/* Modern Search & Filtering Panel */}
      <div className="space-y-3 rounded-xl bg-slate-50/50 p-4 border border-slate-200/80 dark:bg-slate-900/50 dark:border-slate-800">
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Search Box */}
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Bands oder Genres suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ×
              </button>
            )}
          </div>

          {/* Favorites Filter */}
          <div className="flex items-center justify-start sm:justify-end">
            <FestivalFavoritesFilterToggle storageKey={storageKey} />
          </div>
        </div>

        {/* Genre Tags Scroll */}
        {allGenres.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Genres filtern</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedGenre(null)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ${
                  selectedGenre === null
                    ? "bg-slate-800 text-white shadow-sm dark:bg-slate-200 dark:text-slate-900"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                Alle Genres
              </button>
              {allGenres.map((genre) => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => setSelectedGenre(selectedGenre === genre ? null : genre)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ${
                    selectedGenre === genre
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>
        )}

        {isFiltered && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>
              Zeige <strong>{visibleIds.length}</strong> von <strong>{order.length}</strong> Acts
            </span>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedGenre(null);
              }}
              className="text-indigo-600 hover:underline dark:text-indigo-400 font-medium"
            >
              Filter zurücksetzen
            </button>
          </div>
        )}
      </div>

      <form action={formAction} className="space-y-3">
        <input type="hidden" name="festivalId" value={festivalId} />
        {/* We submit the full master order so no hidden bands lose their position */}
        <input type="hidden" name="orderedBandIds" value={JSON.stringify(order)} />
        
        <div className="space-y-2">
          {visibleIds.map((bandId) => {
            const band = byId.get(bandId);
            if (!band) return null;
            const index = order.indexOf(bandId);
            const isFirstVisible = visibleIds[0] === band.id;
            const isLastVisible = visibleIds[visibleIds.length - 1] === band.id;

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
                className={`festival-card cursor-move p-3 transition-all hover:border-slate-400 dark:hover:border-slate-600 ${slotGenreAccentClass(band.genres)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      #{index + 1} {band.name}
                    </p>
                    <p className="text-xs text-muted">
                      {band.dayLabel ?? "Unbekannter Tag"}
                    </p>
                  </div>
                  <FestivalFavoriteButton storageKey={storageKey} bandId={band.id} />
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
                          className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[11px] dark:bg-slate-800 dark:border-slate-700"
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
                              className="rounded border border-slate-300 px-1 text-[10px] hover:bg-slate-100 dark:hover:bg-slate-700 dark:border-slate-600 disabled:opacity-50"
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

                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => moveVisible(band.id, -1)}
                    className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                    disabled={isFirstVisible}
                  >
                    ▲ Nach oben
                  </button>
                  <button
                    type="button"
                    onClick={() => moveVisible(band.id, 1)}
                    className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                    disabled={isLastVisible}
                  >
                    ▼ Nach unten
                  </button>
                </div>
                {genreActionMessage ? <p className="mt-2 text-xs text-muted">{genreActionMessage}</p> : null}
              </article>
            );
          })}
        </div>

        {!visibleIds.length ? (
          <div className="text-center py-6 text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <p className="text-sm">Keine Acts gefunden, die den Filtern entsprechen.</p>
          </div>
        ) : null}

        <div className="pt-2">
          <button
            type="submit"
            disabled={pending}
            className="w-full sm:w-auto rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 transition-all shadow-sm"
          >
            {pending ? "Wird gespeichert..." : "Ranking speichern"}
          </button>
        </div>

        {state.message ? (
          <p className={`text-sm font-medium mt-2 ${state.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
            {state.message}
          </p>
        ) : null}
      </form>
    </section>
  );
}
