import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getGroupContext } from "@/lib/supabase/queries";
import { getSlotStatus } from "@/lib/timeline/status";
import { GroupNav } from "@/components/group-nav";
import { GroupDayTabs } from "@/components/group-day-tabs";
import { TimelineLiveRefresh } from "@/components/timeline-live-refresh";
import { formatDateLong } from "@/lib/format/date";

function statusClasses(status: ReturnType<typeof getSlotStatus>) {
  if (status === "running_now") return "border-success bg-green-900/30";
  if (status === "finished") return "border-slate-300 opacity-70";
  return "border-accent/60";
}

function statusLabel(status: ReturnType<typeof getSlotStatus>) {
  if (status === "running_now") return "Laeuft jetzt";
  if (status === "upcoming") return "Demnaechst";
  return "Vorbei";
}

export default async function TimelinePage({
  params,
  searchParams
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const { groupId } = await params;
  const { day } = await searchParams;
  const { group, days, bands } = await getGroupContext(groupId);
  const selectedDayId = days.some((d) => d.id === day) ? day : undefined;
  const supabase = await createClient();

  let slots: Array<{
    id: string;
    stage: string | null;
    starts_at: string;
    ends_at: string;
    festival_day_id: string;
    bands: { name: string } | { name: string }[] | null;
  }> = [];
  if (bands.length) {
    const { data } = await supabase
      .from("band_slots")
      .select("id,stage,starts_at,ends_at,festival_day_id,bands(name)")
      .in(
        "band_id",
        bands.map((b) => b.id)
      )
      .order("starts_at", { ascending: true });
    slots = data ?? [];
  }

  const groupedByDay = new Map<string, typeof slots>();
  for (const day of days) groupedByDay.set(day.id, []);
  for (const slot of slots) {
    const existing = groupedByDay.get(slot.festival_day_id) ?? [];
    existing.push(slot);
    groupedByDay.set(slot.festival_day_id, existing);
  }
  const visibleDays = selectedDayId ? days.filter((dayEntry) => dayEntry.id === selectedDayId) : days;

  return (
    <main className="space-y-6">
      <TimelineLiveRefresh />
      <h1 className="text-2xl font-semibold">{group?.name} - Live Timeline</h1>
      <GroupNav groupId={groupId} />
      <GroupDayTabs hrefBase={`/dashboard/groups/${groupId}/timeline`} days={days} selectedDayId={selectedDayId} />
      {visibleDays.map((day) => (
        <section key={day.id} className="rounded-lg bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold">
            {day.label} ({formatDateLong(day.date)})
          </h2>
          <div className="space-y-2">
            {(groupedByDay.get(day.id) ?? []).map((slot) => {
              const status = getSlotStatus(slot.starts_at, slot.ends_at);
              return (
                <article key={slot.id} data-slot-status={status} className={`rounded-md border p-3 ${statusClasses(status)}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{Array.isArray(slot.bands) ? slot.bands[0]?.name : slot.bands?.name}</p>
                    {status === "running_now" ? (
                      <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
                        Live
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted font-mono [font-variant-numeric:tabular-nums]">
                    {format(new Date(slot.starts_at), "HH:mm")} - {format(new Date(slot.ends_at), "HH:mm")}
                    {slot.stage ? ` | ${slot.stage}` : ""}
                  </p>
                  <p className="text-xs uppercase tracking-wide">{statusLabel(status)}</p>
                </article>
              );
            })}
            {!(groupedByDay.get(day.id) ?? []).length ? <p className="text-sm text-muted">Keine Slots für diesen Tag.</p> : null}
          </div>
        </section>
      ))}
    </main>
  );
}
