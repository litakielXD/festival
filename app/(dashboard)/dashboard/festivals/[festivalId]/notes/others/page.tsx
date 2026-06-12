import Link from "next/link";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { LinkifiedText } from "@/components/linkified-text";
import { FestivalNav } from "@/components/festival-nav";
import { NotesPdfDownloadButton } from "@/components/notes-pdf-download-button";
import { getFestivalContext } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";

export default async function FestivalOtherNotesPage({
  params,
  searchParams
}: {
  params: Promise<{ festivalId: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const { festivalId } = await params;
  const query = await searchParams;
  const sortMode = query.sort === "alpha" ? "alpha" : "timetable";
  const { festival, groups } = await getFestivalContext(festivalId);
  const supabase = await createClient();
  const groupIds = groups.map((g) => g.id);

  const { data: days } = groupIds.length
    ? await supabase
        .from("festival_days")
        .select("id,date,label")
        .in("group_id", groupIds)
        .order("date", { ascending: true })
    : { data: [] as Array<{ id: string; date: string; label: string }> };
  const { data: bands } = groupIds.length
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

  const bandIds = (bands ?? []).map((b) => b.id);
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

  const dayById = new Map((days ?? []).map((day) => [day.id, day]));
  const slotMetaByBandId = new Map<string, { dayId: string | null; startsAt: string | null }>();
  for (const slot of slots ?? []) {
    const day = Array.isArray(slot.festival_days) ? slot.festival_days[0] : slot.festival_days;
    const existing = slotMetaByBandId.get(slot.band_id);
    if (!existing || (slot.starts_at && (!existing.startsAt || slot.starts_at < existing.startsAt))) {
      slotMetaByBandId.set(slot.band_id, { dayId: day?.id ?? null, startsAt: slot.starts_at });
    }
  }

  const bandMetaById = new Map(
    (bands ?? []).map((band) => {
      const slotMeta = slotMetaByBandId.get(band.id);
      const dayId = slotMeta?.dayId ?? band.festival_day_id ?? null;
      const day = dayId ? dayById.get(dayId) : null;
      return [
        band.id,
        {
          bandName: band.name,
          dayLabel: day?.label ?? "Ohne Spieltag",
          dayDate: day?.date ?? "9999-12-31",
          startsAt: slotMeta?.startsAt ?? "9999-12-31T23:59:59Z",
          daySortIndex: band.day_sort_index ?? 9999,
          createdAt: band.created_at
        }
      ];
    })
  );

  let notes: Array<{
    id: string;
    band_id: string;
    content: string;
    visibility: string;
    author_id: string;
    bands: { name: string } | { name: string }[] | null;
    author_name?: string;
  }> = [];
  if (bandIds.length) {
    const { data } = await supabase
      .from("notes")
      .select("id,band_id,content,visibility,author_id,bands(name)")
      .in("band_id", bandIds)
      .order("id", { ascending: true });
    notes = data ?? [];
  }

  const authorIds = Array.from(new Set(notes.map((n) => n.author_id)));
  if (authorIds.length) {
    const { data: profiles } = await supabase.from("profiles").select("user_id,display_name").in("user_id", authorIds);
    const map = new Map((profiles ?? []).filter((p) => p.display_name).map((p) => [p.user_id, p.display_name as string]));

    const missingIds = authorIds.filter((id) => !map.has(id));
    if (missingIds.length) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (serviceRoleKey) {
        const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });
        const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
        for (const user of users) {
          if (missingIds.includes(user.id)) {
            const name =
              (user.user_metadata?.display_name as string | undefined) ||
              user.email?.split("@")[0] ||
              user.email ||
              "Unbekannt";
            map.set(user.id, name);
          }
        }
      }
    }

    notes = notes.map((n) => ({ ...n, author_name: map.get(n.author_id) ?? "Unbekannt" }));
  }

  const compareWithinPerson = (a: (typeof notes)[number], b: (typeof notes)[number]) => {
    const aMeta = bandMetaById.get(a.band_id);
    const bMeta = bandMetaById.get(b.band_id);
    const aBand = (aMeta?.bandName ?? (Array.isArray(a.bands) ? a.bands[0]?.name : a.bands?.name) ?? "").toLocaleLowerCase("de-DE");
    const bBand = (bMeta?.bandName ?? (Array.isArray(b.bands) ? b.bands[0]?.name : b.bands?.name) ?? "").toLocaleLowerCase("de-DE");

    if (sortMode === "alpha") {
      const byBand = aBand.localeCompare(bBand, "de-DE");
      if (byBand !== 0) return byBand;
      return a.id.localeCompare(b.id);
    }

    const byDay = (aMeta?.dayDate ?? "9999-12-31").localeCompare(bMeta?.dayDate ?? "9999-12-31");
    if (byDay !== 0) return byDay;
    const byStart = (aMeta?.startsAt ?? "9999-12-31T23:59:59Z").localeCompare(bMeta?.startsAt ?? "9999-12-31T23:59:59Z");
    if (byStart !== 0) return byStart;
    const bySort = (aMeta?.daySortIndex ?? 9999) - (bMeta?.daySortIndex ?? 9999);
    if (bySort !== 0) return bySort;
    return (aMeta?.createdAt ?? "").localeCompare(bMeta?.createdAt ?? "");
  };

  const notesByPerson = new Map<string, typeof notes>();
  for (const note of notes) {
    const key = note.author_name ?? "Unbekannt";
    const existing = notesByPerson.get(key);
    if (existing) {
      existing.push(note);
    } else {
      notesByPerson.set(key, [note]);
    }
  }

  const groupedByPerson = Array.from(notesByPerson.entries())
    .sort(([aName], [bName]) => aName.localeCompare(bName, "de-DE"))
    .map(([personName, personNotes]) => ({
      personName,
      notes: [...personNotes].sort(compareWithinPerson)
    }));

  const exportRows = groupedByPerson.flatMap((group) =>
    group.notes.map((note) => {
      const meta = bandMetaById.get(note.band_id);
      const bandName = meta?.bandName ?? (Array.isArray(note.bands) ? note.bands[0]?.name : note.bands?.name) ?? "Unbekannte Band";
      return {
        dayLabel: meta?.dayLabel ?? "Ohne Spieltag",
        bandName,
        authorName: group.personName,
        content: note.content
      };
    })
  );

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">{festival.name} - Hausaufgaben der anderen</h1>
      <FestivalNav festivalId={festivalId} />
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/dashboard/festivals/${festivalId}/notes`} className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100">
          Zurück zu meinen Hausaufgaben
        </Link>
        <NotesPdfDownloadButton
          filename={`hausaufgaben-der-anderen-${festival.name.replace(/\s+/g, "-").toLowerCase()}.pdf`}
          title={`${festival.name} - Hausaufgaben der anderen`}
          rows={exportRows}
        />
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Sortieren nach:</span>
          <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
            <Link
              href={`/dashboard/festivals/${festivalId}/notes/others?sort=timetable`}
              className={`px-3 py-2 text-sm ${
                sortMode === "timetable" ? "bg-slate-200 text-slate-900" : "bg-card text-slate-700 hover:bg-slate-100"
              }`}
            >
              Timetable
            </Link>
            <Link
              href={`/dashboard/festivals/${festivalId}/notes/others?sort=alpha`}
              className={`border-l border-slate-300 px-3 py-2 text-sm ${
                sortMode === "alpha" ? "bg-slate-200 text-slate-900" : "bg-card text-slate-700 hover:bg-slate-100"
              }`}
            >
              Alphabetisch
            </Link>
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-slate-300 bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">
          Hausaufgaben-Überblick (nach Person, dann {sortMode === "alpha" ? "alphabetisch" : "Timetable"})
        </h2>
        <div className="space-y-4">
          {groupedByPerson.map((group) => (
            <section key={group.personName} className="rounded-md border border-slate-300">
              <header className="border-b border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium">{group.personName}</header>
              <div className="space-y-2 p-3 md:hidden">
                {group.notes.map((note) => {
                  const meta = bandMetaById.get(note.band_id);
                  const bandName = meta?.bandName ?? (Array.isArray(note.bands) ? note.bands[0]?.name : note.bands?.name) ?? "Unbekannte Band";
                  return (
                    <article key={`${group.personName}-${note.id}-mobile`} className="rounded-md border border-slate-300 p-3">
                      <p className="text-xs text-muted">{meta?.dayLabel ?? "Ohne Spieltag"}</p>
                      <p className="font-medium">{bandName}</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm"><LinkifiedText text={note.content} /></p>
                    </article>
                  );
                })}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-sm">
                  <thead className="text-left">
                    <tr>
                      <th className="border-b border-slate-200 px-3 py-2 font-medium">Spieltag</th>
                      <th className="border-b border-slate-200 px-3 py-2 font-medium">Band</th>
                      <th className="border-b border-slate-200 px-3 py-2 font-medium">Kommentar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.notes.map((note) => {
                      const meta = bandMetaById.get(note.band_id);
                      const bandName = meta?.bandName ?? (Array.isArray(note.bands) ? note.bands[0]?.name : note.bands?.name) ?? "Unbekannte Band";
                      return (
                        <tr key={`${group.personName}-${note.id}-row`}>
                          <td className="border-b border-slate-200 px-3 py-2 align-top">{meta?.dayLabel ?? "Ohne Spieltag"}</td>
                          <td className="border-b border-slate-200 px-3 py-2 align-top font-medium">{bandName}</td>
                          <td className="whitespace-pre-wrap border-b border-slate-300 px-3 py-2 align-top"><LinkifiedText text={note.content} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
          {!groupedByPerson.length ? <p className="text-sm text-muted">Noch keine Hausaufgaben vorhanden.</p> : null}
        </div>
      </section>
    </main>
  );
}
