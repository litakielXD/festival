"use server";

import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth/guards";
import { isSystemAdminEmail } from "@/lib/auth/roles";
import { normalizeManagedIdentifier, toManagedEmail } from "@/lib/auth/identity";
import { festivalWallTimeToUtcIso } from "@/lib/datetime/festival-wall-time";

function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY fehlt.");
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

async function requireSystemAdmin() {
  const user = await requireUser();
  if (!isSystemAdminEmail(user.email)) throw new Error("Kein Zugriff auf Adminbereich.");
  return user;
}

export async function adminCreatePerson(formData: FormData) {
  await requireSystemAdmin();
  const admin = getAdminClient();

  const usernameRaw = String(formData.get("username") || formData.get("name") || "").trim();
  const username = normalizeManagedIdentifier(usernameRaw);
  const password = String(formData.get("password") || "");
  const emailRaw = String(formData.get("email") || "").trim();
  const email = emailRaw || toManagedEmail(username);

  if (!username || !password) return { error: "Benutzername und Passwort sind erforderlich." };
  if (password.length < 8) return { error: "Passwort muss mindestens 8 Zeichen haben." };

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: username,
      username,
      role: "member"
    }
  });
  if (error || !data.user) return { error: error?.message ?? "User konnte nicht erstellt werden." };

  const { error: profileError } = await admin.from("profiles").upsert(
    { user_id: data.user.id, display_name: username },
    { onConflict: "user_id" }
  );
  if (profileError) return { error: profileError.message };

  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function adminDeletePerson(formData: FormData) {
  await requireSystemAdmin();
  const admin = getAdminClient();
  const userId = String(formData.get("userId") || "").trim();
  if (!userId) return { error: "User-ID fehlt." };

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function adminUpdatePersonPassword(formData: FormData) {
  await requireSystemAdmin();
  const admin = getAdminClient();
  const userId = String(formData.get("userId") || "").trim();
  const password = String(formData.get("password") || "");

  if (!userId || !password) return { error: "User-ID und Passwort sind erforderlich." };
  if (password.length < 8) return { error: "Passwort muss mindestens 8 Zeichen haben." };

  const { error } = await admin.auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function adminDeleteFestival(formData: FormData) {
  await requireSystemAdmin();
  const admin = getAdminClient();
  const festivalId = String(formData.get("festivalId") || "").trim();
  if (!festivalId) return { error: "Festival-ID fehlt." };

  const { error } = await admin.from("festivals").delete().eq("id", festivalId);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/festivals");
  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function adminAddFestivalBandSlot(formData: FormData) {
  const user = await requireSystemAdmin();
  const supabase = getAdminClient();

  const festivalId = String(formData.get("festivalId") || "").trim();
  const dayDate = String(formData.get("dayDate") || "").trim();
  const dayLabel = String(formData.get("dayLabel") || "").trim();
  const bandName = String(formData.get("bandName") || "").trim();
  const startsAt = festivalWallTimeToUtcIso(String(formData.get("startsAt") || "").trim());
  const endsAt = festivalWallTimeToUtcIso(String(formData.get("endsAt") || "").trim());
  const stage = String(formData.get("stage") || "").trim();

  if (!festivalId || !dayDate || !bandName || !startsAt || !endsAt) {
    return { error: "Festival, Tag, Band und Start/Ende sind erforderlich." };
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("festival_groups")
    .select("group_id")
    .eq("festival_id", festivalId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (assignmentError) return { error: assignmentError.message };
  if (!assignment?.group_id) return { error: "Festival hat noch keine zugewiesene Gruppe." };
  const groupId = assignment.group_id;

  const { data: day } = await supabase
    .from("festival_days")
    .select("id")
    .eq("group_id", groupId)
    .eq("date", dayDate)
    .maybeSingle();
  let dayId = day?.id;
  if (!dayId) {
    const { data: createdDay, error } = await supabase
      .from("festival_days")
      .insert({ group_id: groupId, date: dayDate, label: dayLabel || dayDate })
      .select("id")
      .single();
    if (error || !createdDay) return { error: error?.message ?? "Festivaltag konnte nicht erstellt werden." };
    dayId = createdDay.id;
  }

  const { data: dayBands } = await supabase
    .from("bands")
    .select("day_sort_index")
    .eq("group_id", groupId)
    .eq("festival_day_id", dayId);
  const nextSortIndex =
    Math.max(0, ...(dayBands ?? []).map((entry) => entry.day_sort_index ?? 0)) + 1;

  const { data: band } = await supabase
    .from("bands")
    .select("id,festival_day_id")
    .eq("group_id", groupId)
    .eq("name", bandName)
    .maybeSingle();
  let bandId = band?.id;
  if (!bandId) {
    const { data: createdBand, error } = await supabase
      .from("bands")
      .insert({
        group_id: groupId,
        name: bandName,
        genre: null,
        created_by: user.id,
        festival_day_id: dayId,
        day_sort_index: nextSortIndex
      })
      .select("id")
      .single();
    if (error || !createdBand) return { error: error?.message ?? "Band konnte nicht erstellt werden." };
    bandId = createdBand.id;
  } else if (band && !band.festival_day_id) {
    await supabase
      .from("bands")
      .update({ festival_day_id: dayId, day_sort_index: nextSortIndex })
      .eq("id", bandId);
  }

  const { error: slotError } = await supabase.from("band_slots").insert({
    band_id: bandId,
    festival_day_id: dayId,
    stage: stage || null,
    starts_at: startsAt,
    ends_at: endsAt
  });
  if (slotError) return { error: slotError.message };

  revalidatePath(`/dashboard/festivals/${festivalId}/timeline`);
  revalidatePath(`/dashboard/festivals/${festivalId}/bands`);
  revalidatePath("/dashboard/admin");
  return { success: true };
}
