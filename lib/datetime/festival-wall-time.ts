import { fromZonedTime } from "date-fns-tz";

/** Spielplanzeiten werden als Ortszeit (Festivals in D/A/CH) behandelt. */
export const FESTIVAL_SCHEDULE_TIMEZONE = "Europe/Berlin";

/**
 * Wandelt eine zeitzonenlose Eingabe (z. B. datetime-local oder Lineup-Import)
 * in eine ISO-UTC-Zeichenkette für Postgres `timestamptz`.
 * Bereits mit Z oder numerischem Offset versehene Werte bleiben unverändert (normalisiert über Date).
 */
export function festivalWallTimeToUtcIso(input: string): string {
  const s = input.trim();
  if (!s) return s;

  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? s : d.toISOString();
  }

  const match = s.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/
  );
  if (!match) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? s : d.toISOString();
  }

  const [, y, mo, day, h, mi, sec = "00"] = match;
  const frac = match[7] ? match[7].padEnd(3, "0").slice(0, 3) : "000";
  const localIso = `${y}-${mo}-${day}T${h}:${mi}:${sec}.${frac}`;
  return fromZonedTime(localIso, FESTIVAL_SCHEDULE_TIMEZONE).toISOString();
}
