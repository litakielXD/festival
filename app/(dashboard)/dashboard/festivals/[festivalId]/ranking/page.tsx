import Link from "next/link";
import { FestivalNav } from "@/components/festival-nav";
import { getFestivalContext } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export default async function FestivalRankingPage({
  params
}: {
  params: Promise<{ festivalId: string }>;
}) {
  const { festivalId } = await params;
  const { festival, groups, members, currentUserId } = await getFestivalContext(festivalId);
  const supabase = await createClient();
  const groupIds = groups.map((group) => group.id);

  const { data: bands } = groupIds.length
    ? await supabase.from("bands").select("id,name,festival_day_id").in("group_id", groupIds)
    : { data: [] as Array<{ id: string; name: string; festival_day_id: string | null }> };
  const bandNameById = new Map((bands ?? []).map((band) => [band.id, band.name]));
  const bandIds = (bands ?? []).map((band) => band.id);

  const { data: slots } = bandIds.length
    ? await supabase
        .from("band_slots")
        .select("band_id,starts_at,festival_days(id,date,label)")
        .in("band_id", bandIds)
        .order("starts_at", { ascending: true })
    : {
        data: [] as Array<{
          band_id: string;
          starts_at: string;
          festival_days: { id: string; date: string; label: string } | { id: string; date: string; label: string }[] | null;
        }>
      };

  const bandDayByBandId = new Map<string, { id: string; label: string; date: string }>();
  for (const slot of slots ?? []) {
    const day = Array.isArray(slot.festival_days) ? slot.festival_days[0] : slot.festival_days;
    if (!day) continue;
    const existing = bandDayByBandId.get(slot.band_id);
    if (!existing || day.date < existing.date) {
      bandDayByBandId.set(slot.band_id, { id: day.id, label: day.label, date: day.date });
    }
  }
  if ((bands ?? []).length) {
    const uniqueDayIds = Array.from(
      new Set((bands ?? []).map((band) => band.festival_day_id).filter(Boolean) as string[])
    );
    if (uniqueDayIds.length) {
      const { data: days } = await supabase.from("festival_days").select("id,date,label").in("id", uniqueDayIds);
      const dayById = new Map((days ?? []).map((day) => [day.id, day]));
      for (const band of bands ?? []) {
        if (!band.festival_day_id) continue;
        if (bandDayByBandId.has(band.id)) continue;
        const day = dayById.get(band.festival_day_id);
        if (!day) continue;
        bandDayByBandId.set(band.id, { id: day.id, label: day.label, date: day.date });
      }
    }
  }

  const { data: rankings } = await supabase
    .from("festival_band_rankings")
    .select("user_id,band_id,rank_position")
    .eq("festival_id", festivalId)
    .order("rank_position", { ascending: true });

  const rankingByUser = new Map<string, Array<{ band_id: string; rank_position: number }>>();
  for (const row of rankings ?? []) {
    const current = rankingByUser.get(row.user_id) ?? [];
    current.push({ band_id: row.band_id, rank_position: row.rank_position });
    rankingByUser.set(row.user_id, current);
  }

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">{festival.name} - Rankings der Teilnehmer</h1>
      <FestivalNav festivalId={festivalId} />
      <Link
        href={`/dashboard/festivals/${festivalId}/bands`}
        className="inline-block rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        Zurück zu Bands
      </Link>
      <section className="space-y-3 rounded-lg border border-slate-300 bg-card p-4">
        {members.map((member) => {
          const memberRanking = rankingByUser.get(member.user_id) ?? [];
          return (
            <article key={member.user_id} className="rounded-md border border-slate-300 p-3">
              <p className="font-medium">
                {member.display_name} {member.user_id === currentUserId ? "(ich)" : ""}
              </p>
              {memberRanking.length ? (
                <div className="mt-2 space-y-3">
                  {Array.from(
                    memberRanking.reduce((acc, row) => {
                      const day = bandDayByBandId.get(row.band_id);
                      const dayKey = day?.id ?? "no-day";
                      const dayLabel = day?.label ?? "Ohne Spieltag";
                      const dayDate = day?.date ?? "9999-12-31";
                      const current = acc.get(dayKey) ?? { dayLabel, dayDate, entries: [] as typeof memberRanking };
                      current.entries.push(row);
                      acc.set(dayKey, current);
                      return acc;
                    }, new Map<string, { dayLabel: string; dayDate: string; entries: typeof memberRanking }>())
                  )
                    .sort((a, b) => a[1].dayDate.localeCompare(b[1].dayDate))
                    .map(([dayKey, dayGroup]) => (
                      <section key={`${member.user_id}-${dayKey}`}>
                        <p className="text-sm font-medium">{dayGroup.dayLabel}</p>
                        <ol className="mt-1 space-y-1 text-sm text-muted">
                          {dayGroup.entries.map((row) => (
                            <li key={`${member.user_id}-${row.band_id}`}>
                              #{row.rank_position} {bandNameById.get(row.band_id) ?? "Unbekannte Band"}
                            </li>
                          ))}
                        </ol>
                      </section>
                    ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">Noch kein Ranking vorhanden.</p>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}
