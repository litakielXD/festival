"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";

export type FestivalRankingActionState = {
  ok: boolean;
  message: string;
};

const defaultFestivalRankingActionState: FestivalRankingActionState = {
  ok: false,
  message: ""
};

export async function saveFestivalBandRanking(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const festivalId = String(formData.get("festivalId") || "").trim();
  const orderedBandIdsRaw = String(formData.get("orderedBandIds") || "").trim();

  if (!festivalId || !orderedBandIdsRaw) {
    return { error: "Festival und Rankingdaten sind erforderlich." };
  }

  let orderedBandIds: string[] = [];
  try {
    const parsed = JSON.parse(orderedBandIdsRaw);
    if (!Array.isArray(parsed)) return { error: "Rankingdaten sind ungültig." };
    orderedBandIds = parsed.map((id) => String(id));
  } catch {
    return { error: "Rankingdaten konnten nicht gelesen werden." };
  }

  if (!orderedBandIds.length) {
    return { error: "Bitte mindestens eine Band sortieren." };
  }

  const { data: festival } = await supabase
    .from("festivals")
    .select("id,created_by")
    .eq("id", festivalId)
    .maybeSingle();
  if (!festival) return { error: "Festival wurde nicht gefunden." };

  const { data: membership } = await supabase
    .from("festival_members")
    .select("user_id")
    .eq("festival_id", festivalId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership && festival.created_by !== user.id) return { error: "Kein Zugriff auf dieses Festival." };

  const { data: assignments } = await supabase
    .from("festival_groups")
    .select("group_id")
    .eq("festival_id", festivalId);
  const groupIds = (assignments ?? []).map((assignment) => assignment.group_id);
  if (!groupIds.length) return { error: "Festival hat keine zugewiesenen Gruppen." };

  const { data: bands } = await supabase.from("bands").select("id").in("group_id", groupIds);
  const allowedBandIds = new Set((bands ?? []).map((band) => band.id));
  const sanitized = orderedBandIds.filter((bandId) => allowedBandIds.has(bandId));
  if (!sanitized.length) return { error: "Keine gültigen Bands für dieses Festival gefunden." };

  const uniqueBandIds = Array.from(new Set(sanitized));
  const payload = uniqueBandIds.map((bandId, index) => ({
    festival_id: festivalId,
    user_id: user.id,
    band_id: bandId,
    rank_position: index + 1
  }));

  const { error: cleanupError } = await supabase
    .from("festival_band_rankings")
    .delete()
    .eq("festival_id", festivalId)
    .eq("user_id", user.id);
  if (cleanupError) return { error: cleanupError.message };

  const { error: insertError } = await supabase.from("festival_band_rankings").insert(payload);
  if (insertError) return { error: insertError.message };

  revalidatePath(`/dashboard/festivals/${festivalId}/bands`);
  revalidatePath(`/dashboard/festivals/${festivalId}/ranking`);
  return { success: true };
}

export async function saveFestivalBandRankingWithState(
  _: FestivalRankingActionState = defaultFestivalRankingActionState,
  formData: FormData
): Promise<FestivalRankingActionState> {
  const result = await saveFestivalBandRanking(formData);
  if ("error" in result) {
    return { ok: false, message: result.error ?? "Ranking konnte nicht gespeichert werden." };
  }
  return { ok: true, message: "Ranking gespeichert." };
}
