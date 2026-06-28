"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  FestivalFavoriteButton,
  FestivalFavoritesFilterToggle
} from "@/components/festival-favorites-controls";
import { FestivalBandGenreAdd } from "@/components/festival-band-genre-add";
import { GenreBadge } from "@/components/genre-badge";
import { removeFestivalBandGenre } from "@/lib/actions/festival-band-genres";
import { slotGenreAccentClass } from "@/lib/genre/normalize";
import { getSlotStatus } from "@/lib/timeline/status";
import { formatDateLong } from "@/lib/format/date";
import { acceptSlotProposal, deleteSlotProposal, submitSlotProposal } from "@/lib/actions/proposals";
import { toast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

type TimelineSlot = {
  id: string;
  bandId: string;
  bandName: string;
  genres: string[];
  genreContributions: Array<{ id: string; genre: string; createdBy: string }>;
  stage: string | null;
  startsAt: string;
  endsAt: string;
};

type TimelineBand = {
  id: string;
  name: string;
  genres: string[];
  genreContributions: Array<{ id: string; genre: string; createdBy: string }>;
};

type TimelineDay = {
  id: string;
  label: string;
  date: string;
  slots: TimelineSlot[];
  unscheduled: TimelineBand[];
};

const CACHE_VERSION = 2;

type SlotProposal = {
  id: string;
  bandId: string;
  festivalDayId: string;
  stage: string | null;
  startsAt: string;
  endsAt: string;
  suggestedBy: string;
  suggestedByName: string;
};

type SheetBandDetail = {
  id: string;
  name: string;
  genres?: string[];
  genreContributions?: Array<{ id: string; genre: string; createdBy: string }>;
  dayLabel: string;
  date: string;
  startsAt?: string;
  endsAt?: string;
  stage?: string | null;
  status?: ReturnType<typeof getSlotStatus>;
  festivalDayId: string;
};

const STAGE_COLORS = [
  "bg-rose-50   border-rose-300   text-rose-700   dark:bg-rose-900/20   dark:border-rose-700   dark:text-rose-300",
  "bg-violet-50 border-violet-300 text-violet-700 dark:bg-violet-900/20 dark:border-violet-700 dark:text-violet-300",
  "bg-sky-50    border-sky-300    text-sky-700    dark:bg-sky-900/20    dark:border-sky-700    dark:text-sky-300",
  "bg-amber-50  border-amber-300  text-amber-700  dark:bg-amber-900/20  dark:border-amber-700  dark:text-amber-300",
  "bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300",
  "bg-orange-50 border-orange-300 text-orange-700 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300",
] as const;

function stageColorClass(stage: string): string {
  let hash = 0;
  for (const c of stage) hash = ((hash * 31) + c.charCodeAt(0)) | 0;
  return STAGE_COLORS[Math.abs(hash) % STAGE_COLORS.length];
}

function statusClasses(status: ReturnType<typeof getSlotStatus>) {
  if (status === "running_now") return "border-green-500 bg-green-50 dark:bg-green-900/20 shadow-[0_0_0_1px_#22c55e,0_0_14px_rgba(34,197,94,0.2)]";
  if (status === "finished") return "border-slate-200 dark:border-slate-800 opacity-60";
  return "border-accent/40";
}

function statusLabel(status: ReturnType<typeof getSlotStatus>) {
  if (status === "running_now") return "Läuft jetzt";
  if (status === "upcoming") return "Demnächst";
  return "Vorbei";
}

function formatUpdatedAt(value: number | null) {
  if (!value) return "unbekannt";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function FestivalTimelineCachedView({
  festivalId,
  currentUserId,
  currentUserFestivalRole = "member",
  initialDays,
  initialProposals = [],
  favoritesStorageKey
}: {
  festivalId: string;
  currentUserId: string;
  currentUserFestivalRole?: "admin" | "member";
  initialDays: TimelineDay[];
  initialProposals?: SlotProposal[];
  favoritesStorageKey: string;
}) {
  const router = useRouter();
  const cacheKey = useMemo(() => `festival:timeline-cache:v${CACHE_VERSION}:${festivalId}`, [festivalId]);
  const [days, setDays] = useState<TimelineDay[]>(initialDays);
  const [proposals, setProposals] = useState<SlotProposal[]>(initialProposals);
  const [usedCache, setUsedCache] = useState(false);
  const [sheetBand, setSheetBand] = useState<SheetBandDetail | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [reconnectInfo, setReconnectInfo] = useState("");
  const [removingContributionId, setRemovingContributionId] = useState<string | null>(null);
  const [genreActionMessage, setGenreActionMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (initialProposals) {
      setProposals(initialProposals);
    }
  }, [initialProposals]);

  useEffect(() => {
    if (initialDays.length) {
      const now = Date.now();
      setDays(initialDays);
      setUsedCache(false);
      window.localStorage.setItem(cacheKey, JSON.stringify({ ts: now, days: initialDays }));
      setLastUpdatedAt(now);
      return;
    }
    try {
      const raw = window.localStorage.getItem(cacheKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { ts?: number; days?: TimelineDay[] };
      if (Array.isArray(parsed.days) && parsed.days.length) {
        setDays(parsed.days);
        setUsedCache(true);
        setLastUpdatedAt(typeof parsed.ts === "number" ? parsed.ts : null);
      }
    } catch {
      // ignore invalid cache payloads
    }
  }, [cacheKey, initialDays]);

  useEffect(() => {
    const onOnline = () => {
      setReconnectInfo("Verbindung wiederhergestellt. Aktualisiere Daten …");
      router.refresh();
      window.setTimeout(() => setReconnectInfo(""), 2500);
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [router]);

  useEffect(() => {
    const supabase = createClient();

    // Subscribe to timeline-relevant table changes to trigger reactives router refreshes
    const timelineChannel = supabase
      .channel(`festival-timeline-updates-${festivalId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "band_slots"
        },
        () => {
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bands"
        },
        () => {
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "band_slot_proposals"
        },
        () => {
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "festival_band_genres"
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(timelineChannel);
    };
  }, [festivalId, router]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FestivalFavoritesFilterToggle storageKey={favoritesStorageKey} />
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Band suchen …"
            className="form-field w-full px-3 py-1.5"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              aria-label="Suche zurücksetzen"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      <p className="time-mono text-xs text-muted">Zuletzt aktualisiert: {formatUpdatedAt(lastUpdatedAt)}</p>
      {reconnectInfo ? (
        <p className="rounded-md border border-emerald-400 bg-emerald-100 px-3 py-2 text-xs text-emerald-900">
          {reconnectInfo}
        </p>
      ) : null}
      {usedCache ? (
        <p className="rounded-md border border-amber-400 bg-amber-100 px-3 py-2 text-xs text-amber-900">
          Offline-Cache aktiv: Es wird die zuletzt gespeicherte Timeline angezeigt.
        </p>
      ) : null}
      {days.map((day) => {
        const q = searchQuery.toLowerCase().trim();
        const visibleSlots = q ? day.slots.filter((s) => s.bandName.toLowerCase().includes(q)) : day.slots;
        const visibleUnscheduled = q ? day.unscheduled.filter((b) => b.name.toLowerCase().includes(q)) : day.unscheduled;
        if (q && visibleSlots.length === 0 && visibleUnscheduled.length === 0) return null;
        return (
        <section key={day.id} className="festival-card p-4">
          <h2 className="mb-3 text-lg font-semibold">
            {day.label}{day.date !== "9999-12-31" ? ` (${formatDateLong(day.date)})` : ""}
          </h2>
          <div className="space-y-2">
            {visibleSlots.map((slot) => {
              const status = getSlotStatus(slot.startsAt, slot.endsAt);
              return (
                <article
                  key={slot.id}
                  data-slot-status={status}
                  data-favorites-filterable="true"
                  data-favorite-band-id={slot.bandId}
                  className={`relative overflow-hidden rounded-lg border p-3 transition-shadow ${statusClasses(status)} ${slotGenreAccentClass(slot.genres)}`}
                >
                  {status === "running_now" && (
                    <div className="absolute inset-x-0 top-0 h-1 animate-pulse bg-green-500" />
                  )}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSheetBand({
                          id: slot.bandId,
                          name: slot.bandName,
                          genres: slot.genres,
                          genreContributions: slot.genreContributions,
                          dayLabel: day.label,
                          date: day.date,
                          startsAt: slot.startsAt,
                          endsAt: slot.endsAt,
                          stage: slot.stage,
                          status,
                          festivalDayId: day.id
                        })
                      }
                      className="font-medium text-left hover:underline"
                    >
                      <span className="flex flex-wrap items-center gap-1">
                        {slot.bandName}
                        {slot.genres.map((g) => (
                          <GenreBadge key={g} genre={g} />
                        ))}
                      </span>
                    </button>
                    <div className="flex items-center gap-2">
                      <FestivalBandGenreAdd
                        festivalId={festivalId}
                        bandId={slot.bandId}
                        mergedGenres={slot.genres}
                        compact
                      />
                      {status === "running_now" ? (
                        <span className="live-flicker rounded-full bg-green-600 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
                          Live
                        </span>
                      ) : null}
                      <FestivalFavoriteButton storageKey={favoritesStorageKey} bandId={slot.bandId} />
                    </div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="time-mono text-sm font-medium">
                      {format(new Date(slot.startsAt), "HH:mm")} – {format(new Date(slot.endsAt), "HH:mm")}
                    </p>
                    {slot.stage && (
                      <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${stageColorClass(slot.stage)}`}>
                        📍 {slot.stage}
                      </span>
                    )}
                    {status !== "running_now" && (
                      <p className="text-xs text-muted">{statusLabel(status)}</p>
                    )}
                  </div>
                </article>
              );
            })}
            {visibleUnscheduled.map((band) => (
              <article
                key={band.id}
                data-favorites-filterable="true"
                data-favorite-band-id={band.id}
                className="festival-card p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSheetBand({
                        id: band.id,
                        name: band.name,
                        genres: band.genres,
                        genreContributions: band.genreContributions,
                        dayLabel: day.label,
                        date: day.date,
                        festivalDayId: day.id
                      })
                    }
                    className="font-medium text-left hover:underline"
                  >
                    <span className="flex flex-wrap items-center gap-1">
                      {band.name}
                      {band.genres.map((g) => (
                        <GenreBadge key={g} genre={g} />
                      ))}
                    </span>
                  </button>
                  <div className="flex items-center gap-2">
                    <FestivalBandGenreAdd
                      festivalId={festivalId}
                      bandId={band.id}
                      mergedGenres={band.genres}
                      compact
                    />
                    <FestivalFavoriteButton storageKey={favoritesStorageKey} bandId={band.id} />
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-sm text-muted">Noch keine Uhrzeit gesetzt</p>
                  {proposals.filter((p) => p.bandId === band.id).length > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-400 border border-indigo-500/20">
                      {proposals.filter((p) => p.bandId === band.id).length}{" "}
                      {proposals.filter((p) => p.bandId === band.id).length === 1 ? "Vorschlag" : "Vorschläge"}
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
            {!visibleSlots.length && !visibleUnscheduled.length ? (
              <p className="text-sm text-muted">Keine Slots oder Bands für diesen Tag.</p>
            ) : null}
          </div>
        </section>
        );
      })}
      {!days.length ? <p className="text-sm text-muted">Noch keine Festivaltage vorhanden.</p> : null}

      {sheetBand ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Band-Details">
          <button
            type="button"
            aria-label="Band-Details schließen"
            onClick={() => setSheetBand(null)}
            className="absolute inset-0 bg-black/35"
          />
          <div className="festival-card absolute inset-x-0 bottom-0 max-h-[70vh] overflow-y-auto rounded-t-2xl p-4 shadow-2xl md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:max-h-[80vh] md:w-[min(560px,92vw)] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 md:hidden" />
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">{sheetBand.name}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  {(sheetBand.genres ?? []).map((g) => (
                    <GenreBadge key={g} genre={g} />
                  ))}
                  <FestivalBandGenreAdd
                    festivalId={festivalId}
                    bandId={sheetBand.id}
                    mergedGenres={sheetBand.genres ?? []}
                  />
                </div>
                {(sheetBand.genreContributions ?? []).length ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {(sheetBand.genreContributions ?? []).map((entry) => {
                      const removable = entry.createdBy === currentUserId;
                      return (
                        <span
                          key={entry.id}
                          className="inline-flex items-center gap-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 text-[11px]"
                        >
                          {entry.genre}
                          {removable ? (
                            <button
                              type="button"
                              disabled={removingContributionId === entry.id}
                              onClick={async () => {
                                setGenreActionMessage("");
                                setRemovingContributionId(entry.id);
                                const res = await removeFestivalBandGenre({
                                  festivalId,
                                  bandId: sheetBand.id,
                                  contributionId: entry.id
                                });
                                setRemovingContributionId(null);
                                if (!res.ok) {
                                  setGenreActionMessage(res.message);
                                  return;
                                }
                                setSheetBand((prev) => {
                                  if (!prev) return prev;
                                  const norm = (v: string) => v.trim().toLowerCase();
                                  const nextGenres = (prev.genres ?? []).filter((g) => norm(g) !== norm(entry.genre));
                                  const nextContrib = (prev.genreContributions ?? []).filter((r) => r.id !== entry.id);
                                  return { ...prev, genres: nextGenres, genreContributions: nextContrib };
                                });
                                setGenreActionMessage("Genre entfernt.");
                                router.refresh();
                              }}
                              className="rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 px-1 text-[10px] hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                              aria-label={`Genre ${entry.genre} entfernen`}
                              title="Eigenen Eintrag entfernen"
                            >
                              ×
                            </button>
                          ) : null}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              <FestivalFavoriteButton storageKey={favoritesStorageKey} bandId={sheetBand.id} />
            </div>
            <p className="text-sm text-muted">
              {sheetBand.dayLabel} ({formatDateLong(sheetBand.date)})
            </p>
            {sheetBand.startsAt && sheetBand.endsAt ? (
              <p className="time-mono mt-2 text-sm">
                {format(new Date(sheetBand.startsAt), "HH:mm")} - {format(new Date(sheetBand.endsAt), "HH:mm")}
                {sheetBand.stage ? ` | ${sheetBand.stage}` : ""}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted">Noch keine Uhrzeit gesetzt</p>
            )}
            {sheetBand.status ? (
              <p className="mt-1 text-xs uppercase tracking-wide text-muted">{statusLabel(sheetBand.status)}</p>
            ) : null}
             {genreActionMessage ? <p className="mt-2 text-xs text-muted">{genreActionMessage}</p> : null}

            {/* Slot Proposals Section for Unscheduled Bands */}
            {!sheetBand.startsAt && !sheetBand.endsAt && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-semibold text-sm">Zeit-Vorschläge</h4>
                
                {currentUserFestivalRole === "admin" ? (
                  <div className="space-y-2">
                    {proposals.filter((p) => p.bandId === sheetBand.id).length === 0 ? (
                      <p className="text-xs text-muted">Noch keine Zeit-Vorschläge von Mitgliedern vorhanden.</p>
                    ) : (
                      proposals
                        .filter((p) => p.bandId === sheetBand.id)
                        .map((prop) => (
                          <div
                            key={prop.id}
                            className="flex items-center justify-between gap-3 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-2.5"
                          >
                            <div>
                              <p className="font-medium text-xs">
                                {format(new Date(prop.startsAt), "HH:mm")} - {format(new Date(prop.endsAt), "HH:mm")}
                                {prop.stage ? ` | ${prop.stage}` : ""}
                              </p>
                              <p className="text-[10px] text-muted">von {prop.suggestedByName}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <form
                                action={async (formData) => {
                                  const res = await acceptSlotProposal(formData);
                                  if (res.success) {
                                    setProposals((prev) => prev.filter((p) => p.bandId !== sheetBand.id));
                                    setSheetBand(null);
                                    toast.success("Band erfolgreich eingeplant!");
                                    router.refresh();
                                  } else {
                                    toast.error(res.error || "Fehler beim Einplanen.");
                                  }
                                }}
                              >
                                <input type="hidden" name="proposalId" value={prop.id} />
                                <input type="hidden" name="festivalId" value={festivalId} />
                                <button
                                  type="submit"
                                  className="inline-flex items-center justify-center gap-1 rounded bg-green-600 hover:bg-green-700 text-white px-2 py-1 text-[11px] font-semibold transition"
                                >
                                  Übernehmen
                                </button>
                              </form>
                              <form
                                action={async (formData) => {
                                  const res = await deleteSlotProposal(formData);
                                  if (res.success) {
                                    setProposals((prev) => prev.filter((p) => p.id !== prop.id));
                                    toast.success("Vorschlag erfolgreich gelöscht.");
                                    router.refresh();
                                  } else {
                                    toast.error(res.error || "Fehler beim Löschen.");
                                  }
                                }}
                              >
                                <input type="hidden" name="proposalId" value={prop.id} />
                                <input type="hidden" name="festivalId" value={festivalId} />
                                <button
                                  type="submit"
                                  className="inline-flex items-center justify-center rounded border border-rose-300 dark:border-rose-900 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 p-1 text-[11px] font-semibold transition"
                                  title="Vorschlag ablehnen"
                                >
                                  Ablehnen
                                </button>
                              </form>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(() => {
                      const myProp = proposals.find((p) => p.bandId === sheetBand.id && p.suggestedBy === currentUserId);
                      if (myProp) {
                        return (
                          <div className="rounded-md border border-accent-neon/30 bg-accent-neon/5 p-3">
                            <p className="text-[10px] font-bold text-accent-neon uppercase tracking-wider mb-1">Dein Vorschlag</p>
                            <p className="font-semibold text-xs">
                              {format(new Date(myProp.startsAt), "HH:mm")} - {format(new Date(myProp.endsAt), "HH:mm")} Uhr
                              {myProp.stage ? ` | ${myProp.stage}` : ""}
                            </p>
                            <form
                              className="mt-2"
                              action={async (formData) => {
                                const res = await deleteSlotProposal(formData);
                                if (res.success) {
                                  setProposals((prev) => prev.filter((p) => p.id !== myProp.id));
                                  toast.success("Dein Vorschlag wurde zurückgezogen.");
                                  router.refresh();
                                } else {
                                  toast.error(res.error || "Fehler beim Löschen.");
                                }
                              }}
                            >
                              <input type="hidden" name="proposalId" value={myProp.id} />
                              <input type="hidden" name="festivalId" value={festivalId} />
                              <button
                                type="submit"
                                className="rounded border border-rose-300 dark:border-rose-900 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/30 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 px-2 py-0.5 text-[11px] font-medium transition"
                              >
                                Vorschlag löschen
                              </button>
                            </form>
                          </div>
                        );
                      }
                      
                      const matchingDay = days.find((d) => d.id === sheetBand.festivalDayId);
                      const existingStages = matchingDay
                        ? Array.from(new Set(matchingDay.slots.map((s) => s.stage).filter((s): s is string => Boolean(s))))
                        : [];

                      return (
                        <form
                          className="space-y-3 rounded-md border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/30 dark:bg-slate-900/30"
                          action={async (formData) => {
                            const starts = String(formData.get("startsTime") || "");
                            const ends = String(formData.get("endsTime") || "");
                            const stage = String(formData.get("stage") || "");
                            
                            if (!starts || !ends) {
                              toast.error("Bitte Start- und Endzeit angeben.");
                              return;
                            }
                            
                            let endDate = sheetBand.date;
                            if (ends <= starts) {
                              const d = new Date(`${sheetBand.date}T00:00:00Z`);
                              d.setUTCDate(d.getUTCDate() + 1);
                              endDate = d.toISOString().slice(0, 10);
                            }
                            
                            const startsAtCombined = `${sheetBand.date}T${starts}`;
                            const endsAtCombined = `${endDate}T${ends}`;
                            
                            const submitData = new FormData();
                            submitData.append("festivalId", festivalId);
                            submitData.append("bandId", sheetBand.id);
                            submitData.append("festivalDayId", sheetBand.festivalDayId);
                            submitData.append("stage", stage);
                            submitData.append("startsAt", startsAtCombined);
                            submitData.append("endsAt", endsAtCombined);
                            
                            const res = await submitSlotProposal(submitData);
                            if (res.success) {
                              setSheetBand(null);
                              toast.success("Vorschlag erfolgreich eingereicht!");
                              router.refresh();
                            } else {
                              toast.error(res.error || "Fehler beim Einreichen.");
                            }
                          }}
                        >
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-medium text-muted uppercase">Start</label>
                              <input
                                type="time"
                                name="startsTime"
                                required
                                className="mt-1 w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-1 text-xs text-mono"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-muted uppercase">Ende</label>
                              <input
                                type="time"
                                name="endsTime"
                                required
                                className="mt-1 w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-1 text-xs text-mono"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-muted uppercase">Bühne (optional)</label>
                            <input
                              type="text"
                              name="stage"
                              list="stages-list"
                              placeholder="z. B. Main Stage"
                              className="mt-1 w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-1 text-xs"
                            />
                            <datalist id="stages-list">
                              {existingStages.map((st) => (
                                <option key={st} value={st} />
                              ))}
                            </datalist>
                          </div>
                          <button
                            type="submit"
                            className="w-full rounded bg-accent-neon text-black font-semibold px-3 py-1 text-xs transition hover:opacity-90"
                          >
                            Vorschlag einreichen
                          </button>
                        </form>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={() => setSheetBand(null)}
              className="mt-4 w-full rounded-md border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Schließen
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
