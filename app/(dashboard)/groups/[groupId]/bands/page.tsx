import { createBand, createBandSlot, createFestivalDay } from "@/lib/actions/bands";
import { createClient } from "@/lib/supabase/server";
import { getGroupContext } from "@/lib/supabase/queries";
import { GroupNav } from "@/components/group-nav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function BandsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const { group, role, days, bands } = await getGroupContext(groupId);
  const supabase = await createClient();
  let slots: Array<{
    id: string;
    stage: string | null;
    starts_at: string;
    ends_at: string;
    bands: { name: string } | { name: string }[] | null;
  }> = [];

  if (bands.length) {
    const { data } = await supabase
      .from("band_slots")
      .select("id,stage,starts_at,ends_at,bands(name)")
      .in(
        "band_id",
        bands.map((b) => b.id)
      )
      .order("starts_at", { ascending: true });
    slots = data ?? [];
  }

  return (
    <main>
      <h1 className="text-2xl font-semibold">{group?.name} - Bands</h1>
      <GroupNav groupId={groupId} />

      {role === "admin" ? (
        <section className="mb-6 grid gap-4 md:grid-cols-3">
          <form
            action={async (formData) => {
              "use server";
              await createBand(formData);
            }}
            className="space-y-3 rounded-lg border border-slate-700 p-4"
          >
            <h2 className="font-semibold">Band erfassen</h2>
            <input type="hidden" name="groupId" value={groupId} />
            <Input name="name" placeholder="Bandname" required />
            <Input name="genre" placeholder="Genre (optional)" />
            <Button type="submit">Band speichern</Button>
          </form>

          <form
            action={async (formData) => {
              "use server";
              await createBandSlot(formData);
            }}
            className="space-y-3 rounded-lg border border-slate-700 p-4"
          >
            <h2 className="font-semibold">Timeslot anlegen</h2>
            <input type="hidden" name="groupId" value={groupId} />
            <select className="w-full rounded-md bg-slate-900 p-2" name="bandId" required>
              <option value="">Band waehlen</option>
              {bands.map((band) => (
                <option key={band.id} value={band.id}>
                  {band.name}
                </option>
              ))}
            </select>
            <select className="w-full rounded-md bg-slate-900 p-2" name="festivalDayId" required>
              <option value="">Tag waehlen</option>
              {days.map((day) => (
                <option key={day.id} value={day.id}>
                  {day.label}
                </option>
              ))}
            </select>
            <Input name="stage" placeholder="Stage (optional)" />
            <Input name="startsAt" type="datetime-local" required />
            <Input name="endsAt" type="datetime-local" required />
            <Button type="submit">Slot speichern</Button>
          </form>

          <form
            action={async (formData) => {
              "use server";
              await createFestivalDay(formData);
            }}
            className="space-y-3 rounded-lg border border-slate-700 p-4"
          >
            <h2 className="font-semibold">Festivaltag anlegen</h2>
            <input type="hidden" name="groupId" value={groupId} />
            <Input name="label" placeholder="Label (z. B. Freitag)" required />
            <Input name="date" type="date" required />
            <Button type="submit" variant="secondary">
              Tag speichern
            </Button>
          </form>
        </section>
      ) : null}

      <section className="rounded-lg bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Alle Bands</h2>
        <div className="grid gap-3">
          {bands.map((band) => (
            <article key={band.id} className="rounded-md border border-slate-700 p-3">
              <p className="font-medium">{band.name}</p>
              <p className="text-sm text-muted">{band.genre ?? "Ohne Genre"}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded-lg bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Geplante Slots</h2>
        <div className="space-y-2 text-sm">
          {slots.map((slot) => (
            <div key={slot.id} className="rounded-md border border-slate-700 p-3">
              <p>{Array.isArray(slot.bands) ? slot.bands[0]?.name : slot.bands?.name}</p>
              <p className="text-muted">
                {slot.starts_at} - {slot.ends_at} {slot.stage ? `| ${slot.stage}` : ""}
              </p>
            </div>
          ))}
          {!slots.length ? <p className="text-muted">Noch keine Slots vorhanden.</p> : null}
        </div>
      </section>
    </main>
  );
}
