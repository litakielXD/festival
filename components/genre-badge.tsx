"use client";

import { genreLabel, normalizeGenre, type GenreKey } from "@/lib/genre/normalize";

function genreIcon(key: GenreKey) {
  if (key === "metal") return "⚡";
  if (key === "techno") return "∿";
  if (key === "punk") return "🧷";
  if (key === "indie") return "✦";
  if (key === "rock") return "🎸";
  return "•";
}

export function GenreBadge({ genre }: { genre: string | null | undefined }) {
  const key = normalizeGenre(genre);
  const displayText = String(genre ?? "").trim() || genreLabel(key);
  return (
    <span className={`genre-badge genre-${key}`}>
      <span aria-hidden="true">{genreIcon(key)}</span>
      <span>{displayText}</span>
    </span>
  );
}
