"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";

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
    return { error: "Nur Admins duerfen Bands anlegen." };
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
    return { error: "Nur Admins duerfen Festivaltage anlegen." };
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
  const startsAt = String(formData.get("startsAt") || "");
  const endsAt = String(formData.get("endsAt") || "");

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return { error: "Nur Admins duerfen Slots anlegen." };
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
