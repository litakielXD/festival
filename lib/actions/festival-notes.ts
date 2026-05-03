"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";

async function getFestivalBandIds(supabase: Awaited<ReturnType<typeof createClient>>, festivalId: string) {
  const { data: assignments } = await supabase.from("festival_groups").select("group_id").eq("festival_id", festivalId);
  const groupIds = (assignments ?? []).map((a) => a.group_id);
  if (!groupIds.length) return [];
  const { data: bands } = await supabase.from("bands").select("id").in("group_id", groupIds);
  return (bands ?? []).map((b) => b.id);
}

export async function createFestivalNote(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const festivalId = String(formData.get("festivalId") || "").trim();
  const bandId = String(formData.get("bandId") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const visibility = String(formData.get("visibility") || "private") === "group" ? "group" : "private";

  const { data: membership } = await supabase
    .from("festival_members")
    .select("user_id")
    .eq("festival_id", festivalId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { error: "Kein Zugriff auf dieses Festival." };

  const allowedBandIds = await getFestivalBandIds(supabase, festivalId);
  if (!allowedBandIds.includes(bandId)) return { error: "Band gehört nicht zu diesem Festival." };

  const { error } = await supabase.from("notes").insert({ band_id: bandId, author_id: user.id, content, visibility });
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/festivals/${festivalId}/notes`);
  return { success: true };
}

export async function updateFestivalNote(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const festivalId = String(formData.get("festivalId") || "").trim();
  const noteId = String(formData.get("noteId") || "").trim();
  const content = String(formData.get("content") || "").trim();
  const visibility = String(formData.get("visibility") || "private") === "group" ? "group" : "private";

  if (!festivalId || !noteId || !content) return { error: "Notiz konnte nicht aktualisiert werden." };

  const { data: membership } = await supabase
    .from("festival_members")
    .select("user_id")
    .eq("festival_id", festivalId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { error: "Kein Zugriff auf dieses Festival." };

  const { error } = await supabase
    .from("notes")
    .update({ content, visibility })
    .eq("id", noteId)
    .eq("author_id", user.id);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/festivals/${festivalId}/notes`);
  return { success: true };
}

export async function deleteFestivalNote(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const festivalId = String(formData.get("festivalId") || "").trim();
  const noteId = String(formData.get("noteId") || "").trim();

  if (!festivalId || !noteId) return { error: "Notiz konnte nicht gelöscht werden." };

  const { data: membership } = await supabase
    .from("festival_members")
    .select("user_id")
    .eq("festival_id", festivalId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!membership) return { error: "Kein Zugriff auf dieses Festival." };

  const { error } = await supabase.from("notes").delete().eq("id", noteId).eq("author_id", user.id);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/festivals/${festivalId}/notes`);
  return { success: true };
}
