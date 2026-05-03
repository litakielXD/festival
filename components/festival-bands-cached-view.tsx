"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { FestivalBandRankingBoard } from "@/components/festival-band-ranking-board";

type DayOption = { id: string; date: string; label: string };
type BandItem = {
  id: string;
  name: string;
  genres: string[];
  dayLabel: string | null;
  genreContributions: Array<{ id: string; genre: string; createdBy: string }>;
};

const CACHE_VERSION = 2;

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

export function FestivalBandsCachedView({
  festivalId,
  currentUserId,
  dayOptions,
  selectedDayId,
  bands,
  initialRankingOrder
}: {
  festivalId: string;
  currentUserId: string;
  dayOptions: DayOption[];
  selectedDayId?: string;
  bands: BandItem[];
  initialRankingOrder: string[];
}) {
  const router = useRouter();
  const cacheKey = useMemo(
    () => `festival:bands-cache:v${CACHE_VERSION}:${festivalId}:${selectedDayId ?? "none"}`,
    [festivalId, selectedDayId]
  );
  const [cached, setCached] = useState<{
    dayOptions: DayOption[];
    bands: BandItem[];
    initialRankingOrder: string[];
  } | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [reconnectInfo, setReconnectInfo] = useState("");

  useEffect(() => {
    if (bands.length || dayOptions.length) {
      const now = Date.now();
      window.localStorage.setItem(
        cacheKey,
        JSON.stringify({
          ts: now,
          dayOptions,
          bands,
          initialRankingOrder
        })
      );
      setCached(null);
      setLastUpdatedAt(now);
      return;
    }
    try {
      const raw = window.localStorage.getItem(cacheKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        ts?: number;
        dayOptions?: DayOption[];
        bands?: BandItem[];
        initialRankingOrder?: string[];
      };
      if (Array.isArray(parsed.dayOptions) && Array.isArray(parsed.bands) && Array.isArray(parsed.initialRankingOrder)) {
        setCached({
          dayOptions: parsed.dayOptions,
          bands: parsed.bands,
          initialRankingOrder: parsed.initialRankingOrder
        });
        setLastUpdatedAt(typeof parsed.ts === "number" ? parsed.ts : null);
      }
    } catch {
      setCached(null);
    }
  }, [cacheKey, dayOptions, bands, initialRankingOrder]);

  useEffect(() => {
    const onOnline = () => {
      setReconnectInfo("Verbindung wiederhergestellt. Aktualisiere Daten …");
      router.refresh();
      window.setTimeout(() => setReconnectInfo(""), 2500);
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [router]);

  const data = cached ?? { dayOptions, bands, initialRankingOrder };
  const effectiveSelectedDayId = selectedDayId ?? data.dayOptions[0]?.id;

  return (
    <div className="space-y-4">
      <p className="time-mono text-xs text-muted">Zuletzt aktualisiert: {formatUpdatedAt(lastUpdatedAt)}</p>
      {reconnectInfo ? (
        <p className="rounded-md border border-emerald-400 bg-emerald-100 px-3 py-2 text-xs text-emerald-900">
          {reconnectInfo}
        </p>
      ) : null}
      {cached ? (
        <p className="rounded-md border border-amber-400 bg-amber-100 px-3 py-2 text-xs text-amber-900">
          Offline-Cache aktiv: Es wird die zuletzt gespeicherte Band-Ansicht angezeigt.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-2 text-sm">
          {data.dayOptions.map((day) => (
            <Link
              key={day.id}
              href={`/dashboard/festivals/${festivalId}/bands?day=${day.id}`}
              className={`festival-tab-link festival-button-tactile ${
                effectiveSelectedDayId === day.id ? "festival-tab-link-active" : "festival-tab-link-idle"
              }`}
            >
              {day.label}
            </Link>
          ))}
        </nav>
        <Link
          href={`/dashboard/festivals/${festivalId}/ranking`}
          className="festival-tab-link festival-button-tactile festival-tab-link-idle text-sm"
        >
          Ranking der anderen anschauen
        </Link>
      </div>
      {effectiveSelectedDayId ? (
        <FestivalBandRankingBoard
          festivalId={festivalId}
          currentUserId={currentUserId}
          bands={data.bands}
          initialOrder={data.initialRankingOrder}
        />
      ) : (
        <section className="festival-card p-4 text-sm text-muted">
          Bitte zuerst einen Spieltag auswählen, um das Band-Ranking für diesen Tag zu bearbeiten.
        </section>
      )}
    </div>
  );
}
