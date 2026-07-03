"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { updateFestivalNote, deleteFestivalNote, batchUpdateFestivalNoteVisibility } from "@/lib/actions/festival-notes";

interface NoteItem {
  id: string;
  band_id: string;
  content: string;
  visibility: string;
  author_id: string;
  bands: { name: string } | { name: string }[] | null;
  author_name?: string;
  bandName: string;
  dayLabel: string;
  dayDate: string;
}

interface BandItem {
  id: string;
  name: string;
}

interface FestivalNotesListProps {
  initialNotes: NoteItem[];
  bands: BandItem[];
  festivalId: string;
}

export function FestivalNotesList({ initialNotes, bands, festivalId }: FestivalNotesListProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();

  const handleSelectToggle = (noteId: string) => {
    setSelectedIds((prev) =>
      prev.includes(noteId) ? prev.filter((id) => id !== noteId) : [...prev, noteId]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === initialNotes.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(initialNotes.map((n) => n.id));
    }
  };

  const handleBulkVisibilityChange = (visibility: "group" | "private") => {
    if (selectedIds.length === 0) return;

    const formData = new FormData();
    formData.append("festivalId", festivalId);
    formData.append("visibility", visibility);
    selectedIds.forEach((id) => formData.append("noteIds", id));

    startTransition(async () => {
      try {
        const res = await batchUpdateFestivalNoteVisibility(formData);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success(
            visibility === "group"
              ? `${selectedIds.length} Hausaufgaben für die Festival-Gruppe freigegeben!`
              : `${selectedIds.length} Hausaufgaben auf privat gesetzt.`
          );
          setSelectedIds([]);
        }
      } catch {
        toast.error("Ein unerwarteter Fehler ist aufgetreten.");
      }
    });
  };

  const handleQuickToggleVisibility = (noteId: string, currentVisibility: string) => {
    const nextVisibility = currentVisibility === "group" ? "private" : "group";
    const note = initialNotes.find((n) => n.id === noteId);
    if (!note) return;

    const formData = new FormData();
    formData.append("festivalId", festivalId);
    formData.append("noteId", noteId);
    formData.append("content", note.content);
    formData.append("bandId", note.band_id);
    formData.append("visibility", nextVisibility);

    startTransition(async () => {
      try {
        const res = await updateFestivalNote(formData);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success(
            nextVisibility === "group"
              ? "Hausaufgabe für die Festival-Gruppe freigegeben!"
              : "Sichtbarkeit auf privat gesetzt."
          );
        }
      } catch {
        toast.error("Fehler beim Aktualisieren der Sichtbarkeit.");
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Selection Summary at top (optional desk indicator) */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 rounded-xl bg-accent/10 px-3 py-2 text-xs font-semibold text-accent animate-fade-in md:hidden">
          <span>{selectedIds.length} ausgewählt</span>
          <button onClick={() => setSelectedIds([])} className="ml-auto underline">
            Auswahl aufheben
          </button>
        </div>
      )}

      {/* MOBILE LIST */}
      <div className="space-y-3 md:hidden">
        {initialNotes.map((note) => (
          <article
            key={`${note.id}-mobile`}
            className={`relative rounded-xl border p-4 transition-all ${
              selectedIds.includes(note.id)
                ? "border-accent bg-accent/5 dark:bg-accent/10 shadow-md shadow-accent/5"
                : "border-slate-200/80 bg-white/70 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/60"
            }`}
          >
            {/* Checkbox placement */}
            <div className="absolute left-3 top-3.5 z-10">
              <input
                type="checkbox"
                checked={selectedIds.includes(note.id)}
                onChange={() => handleSelectToggle(note.id)}
                className="h-4.5 w-4.5 rounded border-slate-300 text-accent focus:ring-accent dark:border-slate-700 dark:bg-slate-800"
              />
            </div>

            <div className="pl-8">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                    {note.dayLabel}
                  </p>
                  <p className="font-bold text-slate-800 dark:text-slate-100">{note.bandName}</p>
                </div>

                {/* Instant share button */}
                <button
                  type="button"
                  onClick={() => handleQuickToggleVisibility(note.id, note.visibility)}
                  className={`rounded-full p-1.5 transition-all active:scale-95 ${
                    note.visibility === "group"
                      ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-slate-100 text-slate-400 hover:text-slate-600 dark:bg-slate-800 dark:text-slate-500 dark:hover:text-slate-300"
                  }`}
                  title={note.visibility === "group" ? "In Festival-Gruppe freigegeben (Klicken zum Entziehen)" : "Privat (Klicken zum Freigeben)"}
                >
                  {note.visibility === "group" ? "👥" : "🔒"}
                </button>
              </div>

              {/* Edit form */}
              <form
                action={async (fd) => {
                  startTransition(async () => {
                    const res = await updateFestivalNote(fd);
                    if (res?.error) toast.error(res.error);
                    else toast.success("Hausaufgabe gespeichert!");
                  });
                }}
                className="mt-3 space-y-3 border-t border-slate-100 pt-3 dark:border-slate-800/80"
              >
                <input type="hidden" name="festivalId" value={festivalId} />
                <input type="hidden" name="noteId" value={note.id} />
                
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 dark:text-slate-500">Band</label>
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 transition-all dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/15"
                    name="bandId"
                    defaultValue={note.band_id}
                  >
                    {bands.map((band) => (
                      <option key={band.id} value={band.id}>
                        {band.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 dark:text-slate-500">Kommentar</label>
                  <textarea
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 transition-all dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/15"
                    name="content"
                    defaultValue={note.content}
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <div className="w-1/2">
                    <select
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 transition-all dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/15"
                      name="visibility"
                      defaultValue={note.visibility}
                    >
                      <option value="private">🔒 Nur ich</option>
                      <option value="group">👥 Festival-Gruppe</option>
                    </select>
                  </div>
                  <Button type="submit" className="w-1/2 text-xs py-1.5">
                    Speichern
                  </Button>
                </div>
              </form>

              {/* Delete form */}
              <form
                action={async (fd) => {
                  if (!window.confirm("Möchtest du diese Hausaufgabe wirklich löschen?")) return;
                  startTransition(async () => {
                    const res = await deleteFestivalNote(fd);
                    if (res?.error) toast.error(res.error);
                    else toast.success("Hausaufgabe gelöscht.");
                  });
                }}
                className="mt-2"
              >
                <input type="hidden" name="festivalId" value={festivalId} />
                <input type="hidden" name="noteId" value={note.id} />
                <Button type="submit" variant="danger" className="w-full text-xs py-1.5 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400">
                  Löschen
                </Button>
              </form>
            </div>
          </article>
        ))}
        {!initialNotes.length ? (
          <p className="text-center text-sm text-slate-400 dark:text-slate-500 py-8 bg-white/40 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            Noch keine Hausaufgaben vorhanden.
          </p>
        ) : null}
      </div>

      {/* DESKTOP TABLE */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-xl shadow-xl dark:border-slate-800/80 dark:bg-slate-900/60 md:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-950/30">
            <tr className="border-b border-slate-200/80 dark:border-slate-800/80">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={initialNotes.length > 0 && selectedIds.length === initialNotes.length}
                  onChange={handleSelectAll}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-accent focus:ring-accent dark:border-slate-700 dark:bg-slate-800"
                />
              </th>
              <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider w-36">
                Spieltag
              </th>
              <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider w-48">
                Band
              </th>
              <th className="px-4 py-3 font-semibold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                Kommentar
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {initialNotes.map((note) => (
              <tr
                key={`${note.id}-row`}
                className={`transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20 ${
                  selectedIds.includes(note.id) ? "bg-accent/5 dark:bg-accent/10" : ""
                }`}
              >
                <td className="px-4 py-4 align-top">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(note.id)}
                    onChange={() => handleSelectToggle(note.id)}
                    className="h-4.5 w-4.5 rounded border-slate-300 text-accent focus:ring-accent dark:border-slate-700 dark:bg-slate-800"
                  />
                </td>
                <td className="px-4 py-4 align-top font-semibold text-slate-500 dark:text-slate-400">
                  {note.dayLabel}
                </td>
                <td className="px-4 py-4 align-top font-bold text-slate-800 dark:text-slate-100">
                  {note.bandName}
                </td>
                <td className="px-4 py-4 align-top">
                  <form
                    action={async (fd) => {
                      startTransition(async () => {
                        const res = await updateFestivalNote(fd);
                        if (res?.error) toast.error(res.error);
                        else toast.success("Hausaufgabe gespeichert!");
                      });
                    }}
                    className="space-y-3"
                  >
                    <input type="hidden" name="festivalId" value={festivalId} />
                    <input type="hidden" name="noteId" value={note.id} />

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-400 dark:text-slate-500">Band</label>
                        <select
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 transition-all dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/15"
                          name="bandId"
                          defaultValue={note.band_id}
                        >
                          {bands.map((band) => (
                            <option key={band.id} value={band.id}>
                              {band.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center justify-between">
                          Sichtbarkeit
                          <button
                            type="button"
                            onClick={() => handleQuickToggleVisibility(note.id, note.visibility)}
                            className="text-[10px] text-accent hover:underline font-bold"
                          >
                            Schnell-Umschalten
                          </button>
                        </label>
                        <select
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-800 transition-all dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/15"
                          name="visibility"
                          defaultValue={note.visibility}
                        >
                          <option value="private">🔒 Nur ich</option>
                          <option value="group">👥 Festival-Gruppe</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400 dark:text-slate-500">Kommentar</label>
                      <textarea
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-800 transition-all dark:border-slate-700/80 dark:bg-slate-800/40 dark:text-slate-100 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/15"
                        name="content"
                        defaultValue={note.content}
                        required
                      />
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <Button type="submit" className="text-xs px-4 py-1.5">
                        Speichern
                      </Button>
                    </div>
                  </form>

                  <form
                    action={async (fd) => {
                      if (!window.confirm("Möchtest du diese Hausaufgabe wirklich löschen?")) return;
                      startTransition(async () => {
                        const res = await deleteFestivalNote(fd);
                        if (res?.error) toast.error(res.error);
                        else toast.success("Hausaufgabe gelöscht.");
                      });
                    }}
                    className="mt-2 text-right"
                  >
                    <input type="hidden" name="festivalId" value={festivalId} />
                    <input type="hidden" name="noteId" value={note.id} />
                    <Button type="submit" variant="danger" className="text-xs px-3 py-1 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400">
                      Hausaufgabe löschen
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
            {!initialNotes.length ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500 bg-white/40 dark:bg-slate-900/30">
                  Noch keine Hausaufgaben vorhanden.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* PREMIUM FLOATING BULK ACTIONS BAR */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col sm:flex-row items-center gap-3 px-5 py-3.5 rounded-2xl border border-slate-200/80 bg-white/80 dark:border-slate-800/80 dark:bg-slate-950/80 backdrop-blur-md shadow-2xl animate-fade-in max-w-[90vw] sm:max-w-max">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white text-[10px]">
              {selectedIds.length}
            </span>
            <span>Hausaufgaben markiert</span>
          </div>

          <div className="h-px w-full bg-slate-200 dark:bg-slate-800 sm:h-6 sm:w-px" />

          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => handleBulkVisibilityChange("group")}
              disabled={isPending}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white shadow-md shadow-accent/10 transition-all hover:bg-accent/90 active:scale-95 disabled:opacity-50 disabled:scale-100"
            >
              {isPending ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "👥 Freigeben"
              )}
            </button>
            <button
              onClick={() => handleBulkVisibilityChange("private")}
              disabled={isPending}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:bg-slate-700 active:scale-95 disabled:opacity-50 disabled:scale-100 dark:bg-slate-700 dark:hover:bg-slate-600"
            >
              {isPending ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "🔒 Privat machen"
              )}
            </button>
            <button
              onClick={() => setSelectedIds([])}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-200 active:scale-95 disabled:opacity-50 disabled:scale-100 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
