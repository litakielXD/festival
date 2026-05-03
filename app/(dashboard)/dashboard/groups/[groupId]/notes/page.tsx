import { batchUpdateOwnNoteVisibility, createNote, deleteNote, updateNote } from "@/lib/actions/notes";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";
import { getGroupContext } from "@/lib/supabase/queries";
import { GroupNav } from "@/components/group-nav";
import { GroupDayTabs } from "@/components/group-day-tabs";
import { Button } from "@/components/ui/button";

export default async function NotesPage({
  params,
  searchParams
}: {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{ day?: string }>;
}) {
  const { groupId } = await params;
  const { day } = await searchParams;
  const currentUser = await requireUser();
  const currentUserId = currentUser.id;
  const { group, bands } = await getGroupContext(groupId);
  const supabase = await createClient();
  const { data: days } = await supabase
    .from("festival_days")
    .select("id,date,label")
    .eq("group_id", groupId)
    .order("date", { ascending: true });
  const selectedDayId = (days ?? []).some((d) => d.id === day) ? day : undefined;
  let notes: Array<{
    id: string;
    content: string;
    visibility: string;
    bands: { name: string } | { name: string }[] | null;
    author_id: string;
    author_name?: string;
  }> = [];
  let dayBandIds = new Set<string>();

  if (bands.length) {
    if (selectedDayId) {
      const { data: slotsForDay } = await supabase
        .from("band_slots")
        .select("band_id")
        .eq("festival_day_id", selectedDayId)
        .in(
          "band_id",
          bands.map((b) => b.id)
        );
      dayBandIds = new Set((slotsForDay ?? []).map((slot) => slot.band_id));
    }

    const effectiveBandIds = selectedDayId ? bands.filter((b) => dayBandIds.has(b.id)).map((b) => b.id) : bands.map((b) => b.id);
    if (effectiveBandIds.length) {
      const { data } = await supabase
        .from("notes")
        .select("id,content,visibility,bands(name),author_id")
        .in("band_id", effectiveBandIds)
        .order("id", { ascending: false });
      notes = data ?? [];
    }
  }

  const authorIds = Array.from(new Set(notes.map((note) => note.author_id)));
  if (authorIds.length) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id,display_name")
      .in("user_id", authorIds);

    const profileByUserId = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.display_name]));
    notes = notes.map((note) => ({
      ...note,
      author_name: profileByUserId.get(note.author_id) ?? "Unbekannt"
    }));
  }

  const filteredBands = selectedDayId ? bands.filter((band) => dayBandIds.has(band.id)) : bands;

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">{group?.name} - Notizen</h1>
      <GroupNav groupId={groupId} />
      <GroupDayTabs hrefBase={`/dashboard/groups/${groupId}/notes`} days={days ?? []} selectedDayId={selectedDayId} />

      <form
        action={async (formData) => {
          "use server";
          await createNote(formData);
        }}
        className="space-y-3 rounded-lg border border-slate-300 p-4"
      >
        <h2 className="font-semibold">Neue Notiz</h2>
        <input type="hidden" name="groupId" value={groupId} />
        <select className="w-full rounded-md border border-slate-300 bg-slate-100 p-2" name="bandId" required>
          <option value="">Band waehlen</option>
          {!filteredBands.length ? <option value="" disabled>Keine Band fuer diesen Tag</option> : null}
          {filteredBands.map((band) => (
            <option key={band.id} value={band.id}>
              {band.name}
            </option>
          ))}
        </select>
        <textarea
          className="min-h-24 w-full rounded-md border border-slate-300 bg-slate-100 p-2"
          name="content"
          placeholder="Notizinhalt"
          required
        />
        <select className="w-full rounded-md border border-slate-300 bg-slate-100 p-2" name="visibility" defaultValue="private">
          <option value="private">Privat</option>
          <option value="group">Mit Gruppe teilen</option>
        </select>
        <Button type="submit" disabled={!filteredBands.length}>
          Notiz speichern
        </Button>
      </form>

      <section className="rounded-lg bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Notizen</h2>
        <form
          id="notes-batch-form"
          action={async (formData) => {
            "use server";
            await batchUpdateOwnNoteVisibility(formData);
          }}
          className="mb-3 flex items-center gap-2"
        >
          <input type="hidden" name="groupId" value={groupId} />
          <select className="rounded-md border border-slate-300 bg-slate-100 p-2 text-sm" name="visibility" defaultValue="group">
            <option value="private">Privat</option>
            <option value="group">Mit Gruppe teilen</option>
          </select>
          <Button type="submit" variant="secondary">
            Sichtbarkeit fuer Auswahl setzen
          </Button>
        </form>

        <div className="space-y-3">
          {notes.map((note) => {
            const isOwnNote = note.author_id === currentUserId;
            return (
              <article key={note.id} className="rounded-md border border-slate-300 p-3">
                <label className="mb-2 inline-flex items-center gap-2 text-xs text-muted">
                  <input type="checkbox" name="noteIds" value={note.id} form="notes-batch-form" disabled={!isOwnNote} />
                  fuer Batch auswaehlen
                </label>
                <p className="mb-1 text-sm text-muted">
                  {Array.isArray(note.bands) ? note.bands[0]?.name : note.bands?.name} - {note.visibility}
                </p>
                {isOwnNote ? (
                  <form
                    action={async (formData) => {
                      "use server";
                      await updateNote(formData);
                    }}
                    className="space-y-2"
                  >
                    <input type="hidden" name="groupId" value={groupId} />
                    <input type="hidden" name="noteId" value={note.id} />
                    <textarea
                      className="min-h-20 w-full rounded-md border border-slate-300 bg-slate-100 p-2"
                      name="content"
                      defaultValue={note.content}
                      required
                    />
                    <div className="flex items-center gap-2">
                      <select className="rounded-md border border-slate-300 bg-slate-100 p-2 text-sm" name="visibility" defaultValue={note.visibility}>
                        <option value="private">Privat</option>
                        <option value="group">Mit Gruppe teilen</option>
                      </select>
                      <Button type="submit">Speichern</Button>
                    </div>
                  </form>
                ) : (
                  <p>{note.content}</p>
                )}
                <p className="mt-2 text-xs text-muted">von: {note.author_name ?? "Unbekannt"}</p>
                {isOwnNote ? (
                  <form
                    action={async (formData) => {
                      "use server";
                      await deleteNote(formData);
                    }}
                    className="mt-2"
                  >
                    <input type="hidden" name="groupId" value={groupId} />
                    <input type="hidden" name="noteId" value={note.id} />
                    <Button type="submit" variant="danger">
                      Notiz loeschen
                    </Button>
                  </form>
                ) : null}
              </article>
            );
          })}
          {!notes.length ? <p className="text-muted">Noch keine Notizen vorhanden.</p> : null}
        </div>
      </section>
    </main>
  );
}
