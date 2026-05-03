/** Merged display list: legacy group genre first, then festival contributions (chronological), max 3 distinct. */
export function mergeBandGenresForFestival(
  legacyGenre: string | null | undefined,
  contributedOrdered: readonly { genre: string }[]
): string[] {
  const norm = (s: string) => s.trim().toLowerCase();
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (raw: string) => {
    const t = raw.trim();
    if (!t || out.length >= 3) return;
    const k = norm(t);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(t);
  };
  if (legacyGenre?.trim()) push(legacyGenre);
  for (const row of contributedOrdered) push(row.genre);
  return out;
}

export function buildGenreContributionsByBandId(
  rows: readonly { id: string; band_id: string; genre: string; created_at: string; created_by: string }[]
): Map<string, { id: string; genre: string; created_at: string; created_by: string }[]> {
  const m = new Map<string, { id: string; genre: string; created_at: string; created_by: string }[]>();
  for (const r of rows) {
    const list = m.get(r.band_id) ?? [];
    list.push({ id: r.id, genre: r.genre, created_at: r.created_at, created_by: r.created_by });
    m.set(r.band_id, list);
  }
  for (const list of m.values()) {
    list.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  return m;
}
