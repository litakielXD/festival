"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";
import { isSystemAdminEmail } from "@/lib/auth/roles";

export async function createFestival(formData: FormData) {
  const user = await requireUser();
  if (!isSystemAdminEmail(user.email)) {
    return { error: "Nur Admins dürfen Festivals erstellen." };
  }
  const supabase = await createClient();

  const name = String(formData.get("name") || "").trim();
  const startsOn = String(formData.get("startsOn") || "").trim();
  const endsOn = String(formData.get("endsOn") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const avatarUrl = String(formData.get("avatarUrl") || "").trim();

  if (!name) {
    return { error: "Festivalname ist erforderlich." };
  }

  const { error } = await supabase.from("festivals").insert({
    name,
    starts_on: startsOn || null,
    ends_on: endsOn || null,
    location: location || null,
    avatar_url: avatarUrl || null,
    created_by: user.id
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/festivals");
  return { success: true };
}

export async function assignGroupToFestival(formData: FormData) {
  const user = await requireUser();
  if (!isSystemAdminEmail(user.email)) {
    return { error: "Nur Admins dürfen Gruppen zu Festivals zuweisen." };
  }
  const supabase = await createClient();

  const festivalId = String(formData.get("festivalId") || "").trim();
  const groupId = String(formData.get("groupId") || "").trim();

  if (!festivalId || !groupId) {
    return { error: "Festival und Gruppe müssen angegeben werden." };
  }

  const { error } = await supabase.from("festival_groups").upsert(
    {
      festival_id: festivalId,
      group_id: groupId,
      assigned_by: user.id
    },
    { onConflict: "festival_id,group_id" }
  );

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/festivals");
  return { success: true };
}

export async function updateFestival(formData: FormData) {
  const user = await requireUser();
  if (!isSystemAdminEmail(user.email)) {
    return { error: "Nur Admins dürfen Festivaldaten bearbeiten." };
  }
  const supabase = await createClient();

  const festivalId = String(formData.get("festivalId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const startsOn = String(formData.get("startsOn") || "").trim();
  const endsOn = String(formData.get("endsOn") || "").trim();
  const location = String(formData.get("location") || "").trim();
  const avatarUrl = String(formData.get("avatarUrl") || "").trim();

  if (!festivalId || !name) {
    return { error: "Festival und Name sind erforderlich." };
  }

  const { error } = await supabase
    .from("festivals")
    .update({
      name,
      starts_on: startsOn || null,
      ends_on: endsOn || null,
      location: location || null,
      avatar_url: avatarUrl || null
    })
    .eq("id", festivalId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/festivals");
  return { success: true };
}
