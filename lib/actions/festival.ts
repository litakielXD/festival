"use server";

import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";
import { isSystemAdminEmail } from "@/lib/auth/roles";

export type FestivalMemberActionState = {
  ok: boolean;
  message: string;
};

const defaultFestivalMemberActionState: FestivalMemberActionState = {
  ok: false,
  message: ""
};

export async function addFestivalMember(formData: FormData) {
  const user = await requireUser();
  if (!isSystemAdminEmail(user.email)) return { error: "Nur Admins dürfen Mitglieder zuweisen." };
  const festivalId = String(formData.get("festivalId") || "").trim();
  const selectedUserId = String(formData.get("userId") || "").trim();
  const identifier = String(formData.get("identifier") || formData.get("email") || "").trim().toLowerCase();

  if (!festivalId || (!selectedUserId && !identifier)) return { error: "Festival und Benutzername/E-Mail sind erforderlich." };

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return { error: "SUPABASE_SERVICE_ROLE_KEY fehlt." };
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: festival, error: festivalError } = await admin.from("festivals").select("id").eq("id", festivalId).maybeSingle();
  if (festivalError || !festival) return { error: "Festival wurde nicht gefunden." };
  if (selectedUserId) {
    const { error } = await admin.from("festival_members").upsert(
      { festival_id: festivalId, user_id: selectedUserId, role: "member", invited_by: user.id },
      { onConflict: "festival_id,user_id" }
    );
    if (error) return { error: error.message };

    revalidatePath(`/dashboard/festivals/${festivalId}`);
    revalidatePath("/dashboard/festivals");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/admin");
    return { success: true };
  }
  const { data: users, error: userError } = await admin.auth.admin.listUsers();
  if (userError) return { error: userError.message };

  const exactMatch = users.users.find((u) => {
    const email = (u.email ?? "").toLowerCase();
    const name = String(u.user_metadata?.display_name ?? "").toLowerCase();
    const usernameFromEmail = email.split("@")[0] ?? "";
    return email === identifier || name === identifier || usernameFromEmail === identifier;
  });
  if (exactMatch) {
    const { error } = await admin.from("festival_members").upsert(
      { festival_id: festivalId, user_id: exactMatch.id, role: "member", invited_by: user.id },
      { onConflict: "festival_id,user_id" }
    );
    if (error) return { error: error.message };

    revalidatePath(`/dashboard/festivals/${festivalId}`);
    revalidatePath("/dashboard/festivals");
    revalidatePath("/dashboard");
    return { success: true };
  }

  const partialMatches = users.users.filter((u) => {
    const email = (u.email ?? "").toLowerCase();
    const name = String(u.user_metadata?.display_name ?? "").toLowerCase();
    const usernameFromEmail = email.split("@")[0] ?? "";
    return email.includes(identifier) || name.includes(identifier) || usernameFromEmail.includes(identifier);
  });

  if (!partialMatches.length) {
    return { error: "Kein User mit diesem Namen oder dieser E-Mail gefunden." };
  }

  const scored = partialMatches
    .map((u) => {
      const email = (u.email ?? "").toLowerCase();
      const name = String(u.user_metadata?.display_name ?? "").toLowerCase();
      const usernameFromEmail = email.split("@")[0] ?? "";
      const startsWith =
        Number(email.startsWith(identifier)) +
        Number(name.startsWith(identifier)) +
        Number(usernameFromEmail.startsWith(identifier));
      return { user: u, startsWith };
    })
    .sort((a, b) => b.startsWith - a.startsWith);

  const targetUser = scored[0]?.user;
  if (!targetUser) return { error: "Kein User mit diesem Namen oder dieser E-Mail gefunden." };

  const { error } = await admin.from("festival_members").upsert(
    { festival_id: festivalId, user_id: targetUser.id, role: "member", invited_by: user.id },
    { onConflict: "festival_id,user_id" }
  );
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/festivals/${festivalId}`);
  revalidatePath("/dashboard/festivals");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function addFestivalMemberWithState(
  _: FestivalMemberActionState = defaultFestivalMemberActionState,
  formData: FormData
): Promise<FestivalMemberActionState> {
  const result = await addFestivalMember(formData);
  if ("error" in result) {
    return { ok: false, message: result.error ?? "Zuweisung fehlgeschlagen." };
  }
  return { ok: true, message: "Person wurde dem Festival zugewiesen." };
}

export async function removeFestivalMember(formData: FormData) {
  const user = await requireUser();
  if (!isSystemAdminEmail(user.email)) return { error: "Nur Admins dürfen Mitglieder entfernen." };
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return { error: "SUPABASE_SERVICE_ROLE_KEY fehlt." };
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const festivalId = String(formData.get("festivalId") || "").trim();
  const memberId = String(formData.get("memberId") || "").trim();
  if (!festivalId || !memberId) return { error: "Festival und Mitglied sind erforderlich." };

  const { data: festival } = await admin.from("festivals").select("id").eq("id", festivalId).maybeSingle();
  if (!festival) return { error: "Festival wurde nicht gefunden." };

  const { error } = await admin
    .from("festival_members")
    .delete()
    .eq("festival_id", festivalId)
    .eq("user_id", memberId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/festivals/${festivalId}`);
  revalidatePath("/dashboard/festivals");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function updateFestivalMemberRole(formData: FormData) {
  const user = await requireUser();
  if (!isSystemAdminEmail(user.email)) return { error: "Nur Admins dürfen Rollen ändern." };
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return { error: "SUPABASE_SERVICE_ROLE_KEY fehlt." };
  const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const festivalId = String(formData.get("festivalId") || "").trim();
  const memberId = String(formData.get("memberId") || "").trim();
  const role = String(formData.get("role") || "").trim().toLowerCase();
  if (!festivalId || !memberId || !role) return { error: "Festival, Mitglied und Rolle sind erforderlich." };
  if (role !== "admin" && role !== "member") return { error: "Ungültige Rolle." };

  const { data: festival } = await admin.from("festivals").select("id").eq("id", festivalId).maybeSingle();
  if (!festival) return { error: "Festival wurde nicht gefunden." };

  const { data: updated, error } = await admin
    .from("festival_members")
    .update({ role })
    .eq("festival_id", festivalId)
    .eq("user_id", memberId)
    .select("user_id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!updated) return { error: "Mitglied nicht im Festival gefunden." };

  revalidatePath(`/dashboard/festivals/${festivalId}`);
  revalidatePath("/dashboard/festivals");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function updateFestivalMemberRoleWithState(
  _: FestivalMemberActionState = defaultFestivalMemberActionState,
  formData: FormData
): Promise<FestivalMemberActionState> {
  const result = await updateFestivalMemberRole(formData);
  if ("error" in result) {
    return { ok: false, message: result.error ?? "Rolle konnte nicht geändert werden." };
  }
  return { ok: true, message: "Rolle gespeichert." };
}

export async function sendFestivalMessage(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const festivalId = String(formData.get("festivalId") || "").trim();
  const recipientId = String(formData.get("recipientId") || "").trim();
  const content = String(formData.get("content") || "").trim();
  if (!festivalId || !recipientId || !content) return { error: "Empfänger und Inhalt sind erforderlich." };

  const { error } = await supabase.from("festival_direct_messages").insert({
    festival_id: festivalId,
    sender_id: user.id,
    recipient_id: recipientId,
    content
  });
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/festivals/${festivalId}`);
  return { success: true };
}

export async function deleteFestivalMessage(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const festivalId = String(formData.get("festivalId") || "").trim();
  const messageId = String(formData.get("messageId") || "").trim();
  if (!festivalId || !messageId) return { error: "Nachricht nicht gefunden." };

  const { error } = await supabase
    .from("festival_direct_messages")
    .delete()
    .eq("id", messageId)
    .eq("sender_id", user.id);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/festivals/${festivalId}`);
  return { success: true };
}

export async function sendFestivalGroupMessage(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const festivalId = String(formData.get("festivalId") || "").trim();
  const content = String(formData.get("content") || "").trim();
  if (!festivalId || !content) return { error: "Inhalt ist erforderlich." };

  const { error } = await supabase.from("festival_group_messages").insert({
    festival_id: festivalId,
    sender_id: user.id,
    content
  });
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/festivals/${festivalId}`);
  return { success: true };
}

export async function deleteFestivalGroupMessage(formData: FormData) {
  await requireUser();
  const supabase = await createClient();
  const festivalId = String(formData.get("festivalId") || "").trim();
  const messageId = String(formData.get("messageId") || "").trim();
  if (!festivalId || !messageId) return { error: "Nachricht nicht gefunden." };

  const { error } = await supabase
    .from("festival_group_messages")
    .delete()
    .eq("id", messageId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/festivals/${festivalId}`);
  return { success: true };
}
