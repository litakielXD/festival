"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";
import { festivalWallTimeToUtcIso } from "@/lib/datetime/festival-wall-time";

export async function submitSlotProposal(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const festivalId = String(formData.get("festivalId") || "").trim();
  const bandId = String(formData.get("bandId") || "").trim();
  const festivalDayId = String(formData.get("festivalDayId") || "").trim();
  const stage = String(formData.get("stage") || "").trim();
  const startsAt = festivalWallTimeToUtcIso(String(formData.get("startsAt") || "").trim());
  const endsAt = festivalWallTimeToUtcIso(String(formData.get("endsAt") || "").trim());

  if (!festivalId || !bandId || !festivalDayId || !startsAt || !endsAt) {
    return { error: "Pflichtfelder fehlen (Band, Tag, Startzeit oder Endzeit)." };
  }

  if (startsAt >= endsAt) {
    return { error: "Die Startzeit muss vor der Endzeit liegen." };
  }

  const { error } = await supabase.from("band_slot_proposals").upsert(
    {
      festival_id: festivalId,
      band_id: bandId,
      festival_day_id: festivalDayId,
      stage: stage || null,
      starts_at: startsAt,
      ends_at: endsAt,
      suggested_by: user.id
    },
    {
      onConflict: "festival_id,band_id,suggested_by"
    }
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/festivals/${festivalId}/timeline`);
  return { success: true };
}

export async function deleteSlotProposal(formData: FormData) {
  await requireUser();
  const supabase = await createClient();

  const proposalId = String(formData.get("proposalId") || "").trim();
  const festivalId = String(formData.get("festivalId") || "").trim();

  if (!proposalId || !festivalId) {
    return { error: "Ungültige IDs übergeben." };
  }

  const { error } = await supabase.from("band_slot_proposals").delete().eq("id", proposalId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/festivals/${festivalId}/timeline`);
  return { success: true };
}

export async function acceptSlotProposal(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const proposalId = String(formData.get("proposalId") || "").trim();
  const festivalId = String(formData.get("festivalId") || "").trim();

  if (!proposalId || !festivalId) {
    return { error: "Ungültige IDs übergeben." };
  }

  // Security: check if current user is admin of this festival
  const { data: membership } = await supabase
    .from("festival_members")
    .select("role")
    .eq("festival_id", festivalId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: festival } = await supabase
    .from("festivals")
    .select("created_by")
    .eq("id", festivalId)
    .single();

  const isAdmin = festival?.created_by === user.id || membership?.role === "admin";
  if (!isAdmin) {
    return { error: "Nur Festival-Admins dürfen Vorschläge übernehmen." };
  }

  // Fetch the proposal
  const { data: proposal, error: fetchError } = await supabase
    .from("band_slot_proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (fetchError || !proposal) {
    return { error: fetchError?.message ?? "Vorschlag wurde nicht gefunden." };
  }

  // Insert official slot
  const { error: insertError } = await supabase.from("band_slots").insert({
    band_id: proposal.band_id,
    festival_day_id: proposal.festival_day_id,
    stage: proposal.stage,
    starts_at: proposal.starts_at,
    ends_at: proposal.ends_at
  });

  if (insertError) {
    return { error: insertError.message };
  }

  // Delete all proposals for this scheduled band in this festival
  await supabase
    .from("band_slot_proposals")
    .delete()
    .eq("festival_id", festivalId)
    .eq("band_id", proposal.band_id);

  revalidatePath(`/dashboard/festivals/${festivalId}/timeline`);
  return { success: true };
}
