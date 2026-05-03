export type GenreKey = "metal" | "techno" | "punk" | "indie" | "other";

export function normalizeGenre(input: string | null | undefined): GenreKey {
  const value = String(input ?? "").trim().toLowerCase();
  if (!value) return "other";

  if (value.includes("metal") || value.includes("hardcore")) return "metal";
  if (value.includes("techno") || value.includes("electro") || value.includes("house") || value.includes("industrial")) {
    return "techno";
  }
  if (value.includes("punk") || value.includes("post-punk")) return "punk";
  if (value.includes("indie") || value.includes("alternative") || value.includes("alt")) return "indie";
  return "other";
}

export function genreLabel(key: GenreKey) {
  if (key === "metal") return "Metal";
  if (key === "techno") return "Techno";
  if (key === "punk") return "Punk";
  if (key === "indie") return "Indie";
  return "Genre";
}

/** Card accent class for the first matching genre in a list (timeline / ranking). */
export function slotGenreAccentClass(genres: readonly string[]): string {
  for (const g of genres) {
    const k = normalizeGenre(g);
    if (k === "metal") return "festival-genre-metal";
    if (k === "techno") return "festival-genre-techno";
  }
  return "";
}
