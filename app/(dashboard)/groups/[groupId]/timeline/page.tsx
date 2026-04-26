import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { getGroupContext } from "@/lib/supabase/queries";
import { getSlotStatus } from "@/lib/timeline/status";
import { GroupNav } from "@/components/group-nav";
import { TimelineLiveRefresh } from "@/components/timeline-live-refresh";

function statusClasses(status: ReturnType<typeof getSlotStatus>) {
  if (status === "running_now") return "border-success bg-green-900/30";
  if (status === "finished") return "border-slate-700 opacity-70";
  return "border-accent/60";
}

export default async function TimelinePage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const { group, days, bands } = await getGroupContext(groupId);
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

  return (
    <main className="space-y-6">
      <TimelineLiveRefresh />
      <h1 className="text-2xl font-semibold">{group?.name} - Live Timeline</h1>
      <GroupNav groupId={groupId} />
      {days.map((day) => (
        <section key={day.id} className="rounded-lg bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold">
            {day.label} ({format(new Date(day.date), "dd.MM.yyyy")})
          </h2>
          <div className="space-y-2">
            {(groupedByDay.get(day.id) ?? []).map((slot) => {
              const status = getSlotStatus(slot.starts_at, slot.ends_at);
              return (
                <article key={slot.id} className={`rounded-md border p-3 ${statusClasses(status)}`}>
                  <p className="font-medium">{Array.isArray(slot.bands) ? slot.bands[0]?.name : slot.bands?.name}</p>
                  <p className="text-sm text-muted">
                    {format(new Date(slot.starts_at), "HH:mm")} - {format(new Date(slot.ends_at), "HH:mm")}
                    {slot.stage ? ` | ${slot.stage}` : ""}
                  </p>
                  <p className="text-xs uppercase tracking-wide">{status}</p>
                </article>
              );
            })}
            {!(groupedByDay.get(day.id) ?? []).length ? <p className="text-sm text-muted">Keine Slots fuer diesen Tag.</p> : null}
          </div>
        </section>
      ))}
    </main>
  );
}
