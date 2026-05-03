"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";
import { festivalWallTimeToUtcIso } from "@/lib/datetime/festival-wall-time";

type ParsedSlot = {
  dayDate: string;
  bandName: string;
  startsAt: string;
  endsAt: string;
};

function toIsoDate(day: string, month: string, year: string) {
  return `${year}-${month}-${day}`;
}

function combineDateTime(dateIso: string, hhmm: string) {
  return `${dateIso}T${hhmm}:00`;
}

function addOneDay(dateIso: string) {
  const date = new Date(`${dateIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function parseLineup(input: string) {
  const lines = input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const dayHeaderRegex =
    /^(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag),\s*(\d{2})\.(\d{2})\.(\d{4})$/i;
  const slotRegex = /^(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2}):\s*(.+)$/;

  const daysByDate = new Map<string, string>();
  const slots: ParsedSlot[] = [];
  let currentDayIso = "";
  let currentDayLabel = "";

  for (const line of lines) {
    const headerMatch = line.match(dayHeaderRegex);
    if (headerMatch) {
      const [, label, dd, mm, yyyy] = headerMatch;
      currentDayIso = toIsoDate(dd, mm, yyyy);
      currentDayLabel = `${label}, ${dd}.${mm}.${yyyy}`;
      daysByDate.set(currentDayIso, currentDayLabel);
      continue;
    }

    const slotMatch = line.match(slotRegex);
    if (!slotMatch) {
      continue;
    }

    if (!currentDayIso) {
      throw new Error("Bitte zuerst einen Tages-Header setzen, z. B. 'Freitag, 24.04.2026'.");
    }

    const [, startRaw, endRaw, bandNameRaw] = slotMatch;
    const start = startRaw.padStart(5, "0");
    const end = endRaw.padStart(5, "0");
    const bandName = bandNameRaw.trim();

    const startDateIso = currentDayIso;
    const endDateIso = end <= start ? addOneDay(currentDayIso) : currentDayIso;

    slots.push({
      dayDate: currentDayIso,
      bandName,
      startsAt: combineDateTime(startDateIso, start),
      endsAt: combineDateTime(endDateIso, end)
    });
  }

  return {
    days: Array.from(daysByDate.entries()).map(([date, label]) => ({ date, label })),
    slots
  };
}

export async function createBand(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const groupId = String(formData.get("groupId") || "");
  const name = String(formData.get("name") || "");
  const genre = String(formData.get("genre") || "");

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return { error: "Nur Admins dürfen Bands anlegen." };
  }

  const { error } = await supabase
    .from("bands")
    .insert({ group_id: groupId, name, genre: genre || null, created_by: user.id });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/groups/${groupId}/bands`);
  return { success: true };
}

export async function createFestivalDay(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const groupId = String(formData.get("groupId") || "");
  const date = String(formData.get("date") || "");
  const label = String(formData.get("label") || "");

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return { error: "Nur Admins dürfen Festivaltage anlegen." };
  }

  const { error } = await supabase.from("festival_days").insert({
    group_id: groupId,
    date,
    label
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/groups/${groupId}/bands`);
  revalidatePath(`/dashboard/groups/${groupId}/timeline`);
  return { success: true };
}

export async function createBandSlot(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const groupId = String(formData.get("groupId") || "");
  const bandId = String(formData.get("bandId") || "");
  const festivalDayId = String(formData.get("festivalDayId") || "");
  const stage = String(formData.get("stage") || "");
  const startsAt = festivalWallTimeToUtcIso(String(formData.get("startsAt") || ""));
  const endsAt = festivalWallTimeToUtcIso(String(formData.get("endsAt") || ""));

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return { error: "Nur Admins dürfen Slots anlegen." };
  }

  const { error } = await supabase.from("band_slots").insert({
    band_id: bandId,
    festival_day_id: festivalDayId,
    stage: stage || null,
    starts_at: startsAt,
    ends_at: endsAt
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/groups/${groupId}/timeline`);
  return { success: true };
}

export async function importLineup(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const groupId = String(formData.get("groupId") || "");
  const lineupText = String(formData.get("lineupText") || "").trim();

  if (!lineupText) {
    return { error: "Bitte einen Lineup-Text einfügen." };
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return { error: "Nur Admins dürfen den Lineup-Import ausführen." };
  }

  let parsed: ReturnType<typeof parseLineup>;
  try {
    parsed = parseLineup(lineupText);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Lineup konnte nicht gelesen werden." };
  }

  if (!parsed.days.length || !parsed.slots.length) {
    return { error: "Kein gültiger Tages-/Slot-Inhalt gefunden." };
  }

  for (const day of parsed.days) {
    const { data: existingDay } = await supabase
      .from("festival_days")
      .select("id")
      .eq("group_id", groupId)
      .eq("date", day.date)
      .maybeSingle();

    if (!existingDay) {
      const { error } = await supabase.from("festival_days").insert({
        group_id: groupId,
        date: day.date,
        label: day.label
      });
      if (error) return { error: error.message };
    }
  }

  const uniqueBandNames = Array.from(new Set(parsed.slots.map((slot) => slot.bandName)));
  const { data: existingBands, error: existingBandsError } = await supabase
    .from("bands")
    .select("id,name")
    .eq("group_id", groupId)
    .in("name", uniqueBandNames);
  if (existingBandsError) return { error: existingBandsError.message };

  const existingBandNameSet = new Set((existingBands ?? []).map((band) => band.name));
  const missingBands = uniqueBandNames.filter((name) => !existingBandNameSet.has(name));

  if (missingBands.length) {
    const { error } = await supabase.from("bands").insert(
      missingBands.map((name) => ({
        group_id: groupId,
        name,
        genre: null,
        created_by: user.id
      }))
    );
    if (error) return { error: error.message };
  }

  const { data: bands, error: bandsError } = await supabase.from("bands").select("id,name").eq("group_id", groupId);
  if (bandsError) return { error: bandsError.message };
  const bandIdByName = new Map((bands ?? []).map((band) => [band.name, band.id]));

  const { data: days, error: daysError } = await supabase
    .from("festival_days")
    .select("id,date")
    .eq("group_id", groupId);
  if (daysError) return { error: daysError.message };
  const dayIdByDate = new Map((days ?? []).map((day) => [day.date, day.id]));

  for (const slot of parsed.slots) {
    const bandId = bandIdByName.get(slot.bandName);
    const festivalDayId = dayIdByDate.get(slot.dayDate);
    if (!bandId || !festivalDayId) continue;

    const startsAtUtc = festivalWallTimeToUtcIso(slot.startsAt);
    const endsAtUtc = festivalWallTimeToUtcIso(slot.endsAt);

    const { data: existingSlot } = await supabase
      .from("band_slots")
      .select("id")
      .eq("band_id", bandId)
      .eq("festival_day_id", festivalDayId)
      .eq("starts_at", startsAtUtc)
      .eq("ends_at", endsAtUtc)
      .maybeSingle();

    if (!existingSlot) {
      const { error } = await supabase.from("band_slots").insert({
        band_id: bandId,
        festival_day_id: festivalDayId,
        stage: null,
        starts_at: startsAtUtc,
        ends_at: endsAtUtc
      });
      if (error) return { error: error.message };
    }
  }

  revalidatePath(`/dashboard/groups/${groupId}/bands`);
  revalidatePath(`/dashboard/groups/${groupId}/timeline`);
  revalidatePath(`/dashboard/groups/${groupId}/notes`);
  return { success: true };
}
