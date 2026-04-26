import { createNote } from "@/lib/actions/notes";
import { createClient } from "@/lib/supabase/server";
import { getGroupContext } from "@/lib/supabase/queries";
import { GroupNav } from "@/components/group-nav";
import { Button } from "@/components/ui/button";

export default async function NotesPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const { group, bands } = await getGroupContext(groupId);
  const supabase = await createClient();
  let notes: Array<{
    id: string;
    content: string;
    visibility: string;
    bands: { name: string } | { name: string }[] | null;
    author_id: string;
  }> = [];

  if (bands.length) {
    const { data } = await supabase
      .from("notes")
      .select("id,content,visibility,bands(name),author_id")
      .in(
        "band_id",
        bands.map((b) => b.id)
      )
      .order("id", { ascending: false });
    notes = data ?? [];
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">{group?.name} - Notizen</h1>
      <GroupNav groupId={groupId} />

      <form
        action={async (formData) => {
          "use server";
          await createNote(formData);
        }}
        className="space-y-3 rounded-lg border border-slate-700 p-4"
      >
        <h2 className="font-semibold">Neue Notiz</h2>
        <input type="hidden" name="groupId" value={groupId} />
        <select className="w-full rounded-md bg-slate-900 p-2" name="bandId" required>
          <option value="">Band waehlen</option>
          {bands.map((band) => (
            <option key={band.id} value={band.id}>
              {band.name}
            </option>
          ))}
        </select>
        <textarea
          className="min-h-24 w-full rounded-md border border-slate-700 bg-slate-900 p-2"
          name="content"
          placeholder="Notizinhalt"
          required
        />
        <select className="w-full rounded-md bg-slate-900 p-2" name="visibility" defaultValue="private">
          <option value="private">Privat</option>
          <option value="group">Mit Gruppe teilen</option>
        </select>
        <Button type="submit">Notiz speichern</Button>
      </form>

      <section className="rounded-lg bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Notizen</h2>
        <div className="space-y-3">
          {notes.map((note) => (
            <article key={note.id} className="rounded-md border border-slate-700 p-3">
              <p className="mb-1 text-sm text-muted">
                {Array.isArray(note.bands) ? note.bands[0]?.name : note.bands?.name} - {note.visibility}
              </p>
              <p>{note.content}</p>
            </article>
          ))}
          {!notes.length ? <p className="text-muted">Noch keine Notizen vorhanden.</p> : null}
        </div>
      </section>
    </main>
  );
}
