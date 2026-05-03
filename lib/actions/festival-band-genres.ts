"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";
import { mergeBandGenresForFestival } from "@/lib/festival-band-genres";

export type AddFestivalBandGenreResult = { ok: true } | { ok: false; message: string };
export type RemoveFestivalBandGenreResult = { ok: true } | { ok: false; message: string };

export async function addFestivalBandGenre(input: {
  festivalId: string;
  bandId: string;
  genre: string;
}): Promise<AddFestivalBandGenreResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const festivalId = input.festivalId.trim();
  const bandId = input.bandId.trim();
  const trimmed = input.genre.trim();
  if (!festivalId || !bandId) return { ok: false, message: "Ungültige Anfrage." };
  if (!trimmed) return { ok: false, message: "Bitte ein Genre eingeben." };
  if (trimmed.length > 48) return { ok: false, message: "Genre ist zu lang (max. 48 Zeichen)." };

  const { data: festival } = await supabase
    .from("festivals")
    .select("id,created_by")
    .eq("id", festivalId)
    .maybeSingle();
  if (!festival) return { ok: false, message: "Festival wurde nicht gefunden." };

  const { data: membership } = await supabase
    .from("festival_members")
    .select("user_id")
    .eq("festival_id", festivalId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership && festival.created_by !== user.id) {
    return { ok: false, message: "Kein Zugriff auf dieses Festival." };
  }

  const { data: assignments } = await supabase.from("festival_groups").select("group_id").eq("festival_id", festivalId);
  const groupIds = (assignments ?? []).map((a) => a.group_id);
  if (!groupIds.length) return { ok: false, message: "Festival hat keine zugewiesenen Gruppen." };

  const { data: band } = await supabase
    .from("bands")
    .select("id,genre,group_id")
    .eq("id", bandId)
    .maybeSingle();
  if (!band || !groupIds.includes(band.group_id)) {
    return { ok: false, message: "Band gehört nicht zu diesem Festival." };
  }

  const { data: existingRows } = await supabase
    .from("festival_band_genres")
    .select("genre,created_at")
    .eq("festival_id", festivalId)
    .eq("band_id", bandId)
    .order("created_at", { ascending: true });

  const merged = mergeBandGenresForFestival(band.genre, existingRows ?? []);
  if (merged.length >= 3) {
    return { ok: false, message: "Maximal 3 Genres erreicht." };
  }
  const norm = (s: string) => s.trim().toLowerCase();
  if (merged.some((g) => norm(g) === norm(trimmed))) {
    return { ok: false, message: "Dieses Genre ist schon eingetragen." };
  }

  const { error } = await supabase.from("festival_band_genres").insert({
    festival_id: festivalId,
    band_id: bandId,
    genre: trimmed,
    created_by: user.id
  });

  if (error) {
    const m = error.message ?? "";
    if (m.includes("MAX_GENRES")) return { ok: false, message: "Maximal 3 Genres erreicht." };
    if (m.includes("DUPLICATE_GENRE")) return { ok: false, message: "Dieses Genre ist schon eingetragen." };
    return { ok: false, message: m || "Genre konnte nicht gespeichert werden." };
  }

  revalidatePath(`/dashboard/festivals/${festivalId}/bands`);
  revalidatePath(`/dashboard/festivals/${festivalId}/timeline`);
  return { ok: true };
}

export async function removeFestivalBandGenre(input: {
  festivalId: string;
  bandId: string;
  contributionId: string;
}): Promise<RemoveFestivalBandGenreResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const festivalId = input.festivalId.trim();
  const bandId = input.bandId.trim();
  const contributionId = input.contributionId.trim();
  if (!festivalId || !bandId || !contributionId) return { ok: false, message: "Ungültige Anfrage." };

  const { data: festival } = await supabase.from("festivals").select("id,created_by").eq("id", festivalId).maybeSingle();
  if (!festival) return { ok: false, message: "Festival wurde nicht gefunden." };

  const { data: membership } = await supabase
    .from("festival_members")
    .select("user_id")
    .eq("festival_id", festivalId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership && festival.created_by !== user.id) {
    return { ok: false, message: "Kein Zugriff auf dieses Festival." };
  }

  const { data: contribution } = await supabase
    .from("festival_band_genres")
    .select("id,festival_id,band_id,created_by")
    .eq("id", contributionId)
    .maybeSingle();
  if (!contribution || contribution.festival_id !== festivalId || contribution.band_id !== bandId) {
    return { ok: false, message: "Genre-Eintrag wurde nicht gefunden." };
  }
  if (contribution.created_by !== user.id && festival.created_by !== user.id) {
    return { ok: false, message: "Nur Urheber oder Festival-Admin dürfen diesen Eintrag entfernen." };
  }

  const { error } = await supabase
    .from("festival_band_genres")
    .delete()
    .eq("id", contributionId)
    .eq("festival_id", festivalId)
    .eq("band_id", bandId);
  if (error) return { ok: false, message: error.message || "Genre konnte nicht entfernt werden." };

  revalidatePath(`/dashboard/festivals/${festivalId}/bands`);
  revalidatePath(`/dashboard/festivals/${festivalId}/timeline`);
  return { ok: true };
}
