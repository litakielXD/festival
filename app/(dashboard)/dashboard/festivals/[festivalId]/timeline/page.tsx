import { FestivalNav } from "@/components/festival-nav";
import { FestivalTimelineCachedView } from "@/components/festival-timeline-cached-view";
import { TimelineLiveRefresh } from "@/components/timeline-live-refresh";
import { buildGenreContributionsByBandId, mergeBandGenresForFestival } from "@/lib/festival-band-genres";
import { festivalFavoritesStorageKey } from "@/lib/favorites/storage-key";
import { getFestivalContext } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export default async function FestivalTimelinePage({ params }: { params: Promise<{ festivalId: string }> }) {
  const { festivalId } = await params;
  const { festival, groups, currentUserId } = await getFestivalContext(festivalId);
  const supabase = await createClient();
  const groupIds = groups.map((g) => g.id);
  const favoritesStorageKey = festivalFavoritesStorageKey(festivalId, currentUserId);

  let timelineDays: Array<{
    id: string;
    label: string;
    date: string;
    slots: Array<{
      id: string;
      bandId: string;
      bandName: string;
      genres: string[];
      genreContributions: Array<{ id: string; genre: string; createdBy: string }>;
      stage: string | null;
      startsAt: string;
      endsAt: string;
    }>;
    unscheduled: Array<{
      id: string;
      name: string;
      genres: string[];
      genreContributions: Array<{ id: string; genre: string; createdBy: string }>;
    }>;
  }> = [];

  try {
    const { data: days } = groupIds.length
      ? await supabase
          .from("festival_days")
          .select("id,date,label,group_id")
          .in("group_id", groupIds)
          .order("date", { ascending: true })
      : { data: [] as Array<{ id: string; date: string; label: string; group_id: string }> };

    const { data: bands } = groupIds.length
      ? await supabase.from("bands").select("id,name,genre,group_id").in("group_id", groupIds)
      : { data: [] as Array<{ id: string; name: string; genre: string | null; group_id: string }> };
    const bandIds = (bands ?? []).map((b) => b.id);

    const { data: festivalGenreRows } = bandIds.length
      ? await supabase
          .from("festival_band_genres")
          .select("id,band_id,genre,created_at,created_by")
          .eq("festival_id", festivalId)
          .in("band_id", bandIds)
      : {
          data: [] as Array<{ id: string; band_id: string; genre: string; created_at: string; created_by: string }>
        };
    const contribByBand = buildGenreContributionsByBandId(festivalGenreRows ?? []);
    const genresByBandId = new Map<string, string[]>();
    for (const band of bands ?? []) {
      genresByBandId.set(
        band.id,
        mergeBandGenresForFestival(band.genre, contribByBand.get(band.id) ?? [])
      );
    }

    const { data: bandsWithDay } = groupIds.length
      ? await supabase
          .from("bands")
          .select("id,name,festival_day_id,day_sort_index,created_at")
          .in("group_id", groupIds)
          .order("created_at", { ascending: true })
      : {
          data: [] as Array<{
            id: string;
            name: string;
            festival_day_id: string | null;
            day_sort_index: number | null;
            created_at: string;
          }>
        };

    type Slot = {
      id: string;
      band_id: string;
      stage: string | null;
      starts_at: string;
      ends_at: string;
      festival_day_id: string;
      bands: { name: string } | { name: string }[] | null;
    };

    const { data: slotsData } = bandIds.length
      ? await supabase
          .from("band_slots")
          .select("id,band_id,stage,starts_at,ends_at,festival_day_id,bands(name)")
          .in("band_id", bandIds)
          .order("starts_at", { ascending: true })
      : { data: [] as Slot[] };
    const slots: Slot[] = (slotsData ?? []) as Slot[];

    const groupedByDay = new Map<string, Slot[]>();
    for (const day of days ?? []) groupedByDay.set(day.id, []);
    for (const slot of slots) {
      const existing = groupedByDay.get(slot.festival_day_id) ?? [];
      existing.push(slot);
      groupedByDay.set(slot.festival_day_id, existing);
    }

    const scheduledBandIds = new Set(slots.map((slot) => slot.band_id));
    const unscheduledByDay = new Map<
      string,
      Array<{ id: string; name: string; day_sort_index: number | null; created_at: string }>
    >();
    for (const day of days ?? []) unscheduledByDay.set(day.id, []);
    for (const band of bandsWithDay ?? []) {
      if (!band.festival_day_id) continue;
      if (scheduledBandIds.has(band.id)) continue;
      const list = unscheduledByDay.get(band.festival_day_id) ?? [];
      list.push({
        id: band.id,
        name: band.name,
        day_sort_index: band.day_sort_index ?? null,
        created_at: band.created_at
      });
      unscheduledByDay.set(band.festival_day_id, list);
    }
    for (const [dayId, list] of unscheduledByDay.entries()) {
      list.sort((a, b) => {
        const aSort = a.day_sort_index ?? 9999;
        const bSort = b.day_sort_index ?? 9999;
        if (aSort !== bSort) return aSort - bSort;
        if (a.created_at !== b.created_at) return a.created_at.localeCompare(b.created_at);
        return a.name.localeCompare(b.name);
      });
      unscheduledByDay.set(dayId, list);
    }

    timelineDays = (days ?? []).map((day) => ({
      id: day.id,
      label: day.label,
      date: day.date,
      slots: (groupedByDay.get(day.id) ?? []).map((slot) => ({
        id: slot.id,
        bandId: slot.band_id,
        bandName: Array.isArray(slot.bands) ? (slot.bands[0]?.name ?? "Unbekannt") : (slot.bands?.name ?? "Unbekannt"),
        genres: genresByBandId.get(slot.band_id) ?? [],
        genreContributions: (contribByBand.get(slot.band_id) ?? []).map((row) => ({
          id: row.id,
          genre: row.genre,
          createdBy: row.created_by
        })),
        stage: slot.stage,
        startsAt: slot.starts_at,
        endsAt: slot.ends_at
      })),
      unscheduled: (unscheduledByDay.get(day.id) ?? []).map((band) => ({
        id: band.id,
        name: band.name,
        genres: genresByBandId.get(band.id) ?? [],
        genreContributions: (contribByBand.get(band.id) ?? []).map((row) => ({
          id: row.id,
          genre: row.genre,
          createdBy: row.created_by
        }))
      }))
    }));
  } catch {
    // Keep timelineDays empty and let client use cached payload if available.
  }

  return (
    <main className="space-y-4">
      <TimelineLiveRefresh />
      <h1 className="festival-headline">{festival.name} - Timeline</h1>
      <FestivalNav festivalId={festivalId} />
      <FestivalTimelineCachedView
        festivalId={festivalId}
        currentUserId={currentUserId}
        favoritesStorageKey={favoritesStorageKey}
        initialDays={timelineDays}
      />
    </main>
  );
}
