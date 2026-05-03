import { FestivalNav } from "@/components/festival-nav";
import { FestivalBandsCachedView } from "@/components/festival-bands-cached-view";
import { buildGenreContributionsByBandId, mergeBandGenresForFestival } from "@/lib/festival-band-genres";
import { getFestivalContext } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

type BandSlotRow = {
  band_id: string;
  starts_at: string;
  festival_days: { id: string; date: string; label: string } | { id: string; date: string; label: string }[] | null;
};

type BandRow = {
  id: string;
  name: string;
  genre: string | null;
  created_at: string;
  festival_day_id: string | null;
  day_sort_index: number | null;
};

export default async function FestivalBandsPage({
  params,
  searchParams
}: {
  params: Promise<{ festivalId: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const { festivalId } = await params;
  const { day: selectedDay } = await searchParams;
  const { festival, groups, currentUserId } = await getFestivalContext(festivalId);
  const supabase = await createClient();
  const groupIds = groups.map((g) => g.id);
  let dayOptions: Array<{ id: string; date: string; label: string }> = [];
  let effectiveSelectedDay: string | undefined;
  let filteredBands: Array<{
    id: string;
    name: string;
    genres: string[];
    dayLabel: string | null;
    genreContributions: Array<{ id: string; genre: string; createdBy: string }>;
  }> = [];
  let initialRankingOrder: string[] = [];

  try {
    const { data: days } = groupIds.length
      ? await supabase
          .from("festival_days")
          .select("id,date,label")
          .in("group_id", groupIds)
          .order("date", { ascending: true })
      : { data: [] as Array<{ id: string; date: string; label: string }> };

    const { data: bandsData } = groupIds.length
      ? await supabase
          .from("bands")
          .select("id,name,genre,created_at,festival_day_id,day_sort_index")
          .in("group_id", groupIds)
          .order("created_at", { ascending: true })
      : { data: [] as BandRow[] };
    const bands = (bandsData ?? []) as BandRow[];
    const bandIds = bands.map((band) => band.id);

    const { data: festivalGenreRows } = bandIds.length
      ? await supabase
          .from("festival_band_genres")
          .select("id,band_id,genre,created_at,created_by")
          .eq("festival_id", festivalId)
          .in("band_id", bandIds)
      : { data: [] as Array<{ id: string; band_id: string; genre: string; created_at: string; created_by: string }> };
    const contribByBand = buildGenreContributionsByBandId(festivalGenreRows ?? []);

    const { data: slotsData } = bandIds.length
      ? await supabase
          .from("band_slots")
          .select("band_id,starts_at,festival_days(id,date,label)")
          .in("band_id", bandIds)
          .order("starts_at", { ascending: true })
      : { data: [] as BandSlotRow[] };
    const slots = (slotsData ?? []) as BandSlotRow[];

    const { data: myRankingRows } = bandIds.length
      ? await supabase
          .from("festival_band_rankings")
          .select("band_id,rank_position")
          .eq("festival_id", festivalId)
          .eq("user_id", currentUserId)
          .order("rank_position", { ascending: true })
      : { data: [] as Array<{ band_id: string; rank_position: number }> };

    const dayMetaById = new Map((days ?? []).map((day) => [day.id, day]));
    const dayOptionsById = new Map<string, { id: string; date: string; label: string }>();
    const slotMetaByBandId = new Map<
      string,
      { dayIds: string[]; dayLabels: string[]; earliestStartsAt: string | null }
    >();

    for (const slot of slots) {
    const day = Array.isArray(slot.festival_days) ? slot.festival_days[0] : slot.festival_days;
    if (!day) continue;
    dayOptionsById.set(day.id, day);
    const existing = slotMetaByBandId.get(slot.band_id) ?? {
      dayIds: [],
      dayLabels: [],
      earliestStartsAt: null
    };
    if (!existing.dayIds.includes(day.id)) existing.dayIds.push(day.id);
    if (!existing.dayLabels.includes(day.label)) existing.dayLabels.push(day.label);
    if (!existing.earliestStartsAt || slot.starts_at < existing.earliestStartsAt) {
      existing.earliestStartsAt = slot.starts_at;
    }
    slotMetaByBandId.set(slot.band_id, existing);
    }

    const bandView = bands
      .map((band) => {
      const slotMeta = slotMetaByBandId.get(band.id);
      const firstDayId = slotMeta?.dayIds[0] ?? band.festival_day_id ?? null;
      const day = firstDayId ? dayMetaById.get(firstDayId) : null;
      return {
        ...band,
        dayIds: slotMeta?.dayIds?.length ? slotMeta.dayIds : firstDayId ? [firstDayId] : [],
        dayLabel: day?.label ?? slotMeta?.dayLabels[0] ?? null,
        date: day?.date ?? null,
        earliestStartsAt: slotMeta?.earliestStartsAt ?? null,
        day_sort_index: band.day_sort_index
      };
      })
      .sort((a, b) => {
      const aKey = a.earliestStartsAt ?? "9999-12-31T23:59:59Z";
      const bKey = b.earliestStartsAt ?? "9999-12-31T23:59:59Z";
      if (aKey !== bKey) return aKey.localeCompare(bKey);
      const aSort = a.day_sort_index ?? 9999;
      const bSort = b.day_sort_index ?? 9999;
      if (aSort !== bSort) return aSort - bSort;
      if (a.created_at !== b.created_at) return a.created_at.localeCompare(b.created_at);
      return a.name.localeCompare(b.name);
      });

    for (const day of days ?? []) {
      dayOptionsById.set(day.id, day);
    }
    dayOptions = Array.from(dayOptionsById.values()).sort((a, b) => a.date.localeCompare(b.date));
    const todayIso = new Date().toISOString().slice(0, 10);
    const fallbackDayId = dayOptions.find((day) => day.date === todayIso)?.id ?? dayOptions[0]?.id;
    effectiveSelectedDay = selectedDay && dayOptionsById.has(selectedDay) ? selectedDay : fallbackDayId;
    filteredBands = effectiveSelectedDay
      ? bandView
          .filter((band) => band.dayIds.includes(effectiveSelectedDay!))
          .map((band) => ({
            id: band.id,
            name: band.name,
            genres: mergeBandGenresForFestival(band.genre, contribByBand.get(band.id) ?? []),
            dayLabel: band.dayLabel,
            genreContributions: (contribByBand.get(band.id) ?? []).map((row) => ({
              id: row.id,
              genre: row.genre,
              createdBy: row.created_by
            }))
          }))
      : [];
    const filteredBandIds = new Set(filteredBands.map((band) => band.id));
    initialRankingOrder = (myRankingRows ?? [])
      .map((row) => row.band_id)
      .filter((bandId) => filteredBandIds.has(bandId));
  } catch {
    // let client component try cached payload
  }

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">{festival.name} - Bands</h1>
      <FestivalNav festivalId={festivalId} />
      <FestivalBandsCachedView
        festivalId={festivalId}
        currentUserId={currentUserId}
        dayOptions={dayOptions}
        selectedDayId={effectiveSelectedDay}
        bands={filteredBands}
        initialRankingOrder={initialRankingOrder}
      />
    </main>
  );
}
