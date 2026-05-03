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
};

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
  initialDays,
  favoritesStorageKey
}: {
  festivalId: string;
  currentUserId: string;
  initialDays: TimelineDay[];
  favoritesStorageKey: string;
}) {
  const router = useRouter();
  const cacheKey = useMemo(() => `festival:timeline-cache:v${CACHE_VERSION}:${festivalId}`, [festivalId]);
  const [days, setDays] = useState<TimelineDay[]>(initialDays);
  const [usedCache, setUsedCache] = useState(false);
  const [sheetBand, setSheetBand] = useState<SheetBandDetail | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [reconnectInfo, setReconnectInfo] = useState("");
  const [removingContributionId, setRemovingContributionId] = useState<string | null>(null);
  const [genreActionMessage, setGenreActionMessage] = useState("");

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

  return (
    <div className="space-y-4">
      <FestivalFavoritesFilterToggle storageKey={favoritesStorageKey} />
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
      {days.map((day) => (
        <section key={day.id} className="festival-card p-4">
          <h2 className="mb-3 text-lg font-semibold">
            {day.label} ({formatDateLong(day.date)})
          </h2>
          <div className="space-y-2">
            {day.slots.map((slot) => {
              const status = getSlotStatus(slot.startsAt, slot.endsAt);
              return (
                <article
                  key={slot.id}
                  data-slot-status={status}
                  data-favorites-filterable="true"
                  data-favorite-band-id={slot.bandId}
                  className={`rounded-md border p-3 ${statusClasses(status)} ${slotGenreAccentClass(slot.genres)}`}
                >
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
                          status
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
                        <span className="live-flicker rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-white">
                          Live
                        </span>
                      ) : null}
                      <FestivalFavoriteButton storageKey={favoritesStorageKey} bandId={slot.bandId} />
                    </div>
                  </div>
                  <p className="time-mono text-sm text-muted">
                    {format(new Date(slot.startsAt), "HH:mm")} - {format(new Date(slot.endsAt), "HH:mm")}
                    {slot.stage ? ` | ${slot.stage}` : ""}
                  </p>
                  <p className="text-xs uppercase tracking-wide">{statusLabel(status)}</p>
                </article>
              );
            })}
            {day.unscheduled.map((band) => (
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
                        date: day.date
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
                <p className="text-sm text-muted">Noch keine Uhrzeit gesetzt</p>
              </article>
            ))}
            {!day.slots.length && !day.unscheduled.length ? (
              <p className="text-sm text-muted">Keine Slots oder Bands für diesen Tag.</p>
            ) : null}
          </div>
        </section>
      ))}
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
                          className="inline-flex items-center gap-1 rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[11px]"
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
                              className="rounded border border-slate-300 px-1 text-[10px] hover:bg-slate-100 disabled:opacity-50"
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
            <button
              type="button"
              onClick={() => setSheetBand(null)}
              className="mt-4 w-full rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100"
            >
              Schließen
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
