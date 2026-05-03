"use client";

import { useEffect, useMemo, useState } from "react";
import { festivalFavoritesStorageKey } from "@/lib/favorites/storage-key";

type FavoritesChangedDetail = { storageKey: string };

function readFavorites(storageKey: string) {
  if (typeof window === "undefined") return new Set<string>();
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(parsed.filter(Boolean));
  } catch {
    return new Set<string>();
  }
}

function writeFavorites(storageKey: string, values: Set<string>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, JSON.stringify(Array.from(values)));
}

function emitFavoritesChanged(storageKey: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<FavoritesChangedDetail>("festival-favorites-changed", {
      detail: { storageKey }
    })
  );
}

export function FestivalFavoriteButton({
  storageKey,
  bandId
}: {
  storageKey: string;
  bandId: string;
}) {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    const sync = () => {
      const favorites = readFavorites(storageKey);
      setIsFavorite(favorites.has(bandId));
    };
    sync();
    const onChanged = (event: Event) => {
      const custom = event as CustomEvent<FavoritesChangedDetail>;
      if (custom.detail?.storageKey !== storageKey) return;
      sync();
    };
    window.addEventListener("festival-favorites-changed", onChanged);
    return () => window.removeEventListener("festival-favorites-changed", onChanged);
  }, [storageKey, bandId]);

  function toggleFavorite() {
    const favorites = readFavorites(storageKey);
    if (favorites.has(bandId)) favorites.delete(bandId);
    else favorites.add(bandId);
    writeFavorites(storageKey, favorites);
    setIsFavorite(favorites.has(bandId));
    emitFavoritesChanged(storageKey);
  }

  return (
    <button
      type="button"
      onClick={toggleFavorite}
      aria-label={isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
      title={isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
      className={`festival-button-tactile rounded-md border px-2 py-1 text-sm ${
        isFavorite ? "border-amber-500 bg-amber-100 text-amber-700" : "border-slate-300 text-slate-600 hover:bg-slate-100"
      }`}
    >
      {isFavorite ? "♥" : "♡"}
    </button>
  );
}

export function FestivalFavoritesFilterToggle({
  storageKey,
  className = ""
}: {
  storageKey: string;
  className?: string;
}) {
  const [mode, setMode] = useState<"all" | "favorites">("all");

  const rootClassName = useMemo(
    () => `inline-flex overflow-hidden rounded-md border border-slate-300 ${className}`.trim(),
    [className]
  );

  useEffect(() => {
    const modeKey = `${storageKey}:mode`;
    const savedMode = window.localStorage.getItem(modeKey);
    const nextMode: "all" | "favorites" = savedMode === "favorites" ? "favorites" : "all";
    setMode(nextMode);
  }, [storageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const apply = () => {
      const favorites = readFavorites(storageKey);
      const cards = document.querySelectorAll<HTMLElement>("[data-favorites-filterable='true'][data-favorite-band-id]");
      cards.forEach((card) => {
        const bandId = card.dataset.favoriteBandId;
        if (!bandId) return;
        if (mode === "favorites" && !favorites.has(bandId)) card.classList.add("hidden");
        else card.classList.remove("hidden");
      });
    };

    apply();
    const onChanged = (event: Event) => {
      const custom = event as CustomEvent<FavoritesChangedDetail>;
      if (custom.detail?.storageKey !== storageKey) return;
      apply();
    };
    window.addEventListener("festival-favorites-changed", onChanged);
    return () => window.removeEventListener("festival-favorites-changed", onChanged);
  }, [storageKey, mode]);

  function updateMode(nextMode: "all" | "favorites") {
    setMode(nextMode);
    window.localStorage.setItem(`${storageKey}:mode`, nextMode);
  }

  return (
    <div className={rootClassName}>
      <button
        type="button"
        onClick={() => updateMode("all")}
        className={`festival-button-tactile px-3 py-1.5 text-sm ${mode === "all" ? "bg-slate-200 font-semibold text-slate-900" : "bg-white text-slate-600 hover:bg-slate-100"}`}
      >
        Alle Acts
      </button>
      <button
        type="button"
        onClick={() => updateMode("favorites")}
        className={`festival-button-tactile px-3 py-1.5 text-sm ${mode === "favorites" ? "bg-slate-200 font-semibold text-slate-900" : "bg-white text-slate-600 hover:bg-slate-100"}`}
      >
        Meine Auswahl
      </button>
    </div>
  );
}
