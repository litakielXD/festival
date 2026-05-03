"use server";

import { revalidatePath } from "next/cache";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";
import { normalizeManagedIdentifier, toManagedEmail } from "@/lib/auth/identity";

export async function createGroup(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const name = String(formData.get("name") || "").trim();
  const avatarUrl = String(formData.get("avatarUrl") || "").trim();

  if (!name) {
    return { error: "Gruppenname ist erforderlich." };
  }

  const { data: group, error: groupError } = await supabase
    .from("groups")
    .insert({ name, avatar_url: avatarUrl || null, created_by: user.id })
    .select("id")
    .single();

  if (groupError || !group) {
    return { error: groupError?.message ?? "Gruppe konnte nicht erstellt werden." };
  }

  const { error: memberError } = await supabase
    .from("group_members")
    .insert({ group_id: group.id, user_id: user.id, role: "admin" });

  if (memberError) {
    return { error: memberError.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function joinGroup(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const groupId = String(formData.get("groupId") || "").trim();

  if (!groupId) {
    return { error: "Group ID fehlt." };
  }

  const { error } = await supabase
    .from("group_members")
    .upsert({ group_id: groupId, user_id: user.id, role: "member" }, { onConflict: "group_id,user_id" });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  return { success: true };
}

export async function createGroupInvite(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const groupId = String(formData.get("groupId") || "").trim();
  const invitedEmail = String(formData.get("invitedEmail") || "").trim().toLowerCase();

  if (!groupId || !invitedEmail) {
    return { error: "Gruppen-ID und E-Mail sind erforderlich." };
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return { error: "Nur Admins dürfen Einladungen senden." };
  }

  const { error } = await supabase.from("group_invites").insert({
    group_id: groupId,
    invited_email: invitedEmail,
    invited_by: user.id
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/groups/${groupId}`);
  return { success: true };
}

export async function acceptGroupInvite(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const inviteId = String(formData.get("inviteId") || "").trim();

  if (!inviteId) {
    return { error: "Einladung nicht gefunden." };
  }

  const { data: invite, error: inviteError } = await supabase
    .from("group_invites")
    .select("id,group_id,invited_email,status")
    .eq("id", inviteId)
    .single();

  if (inviteError || !invite) {
    return { error: inviteError?.message ?? "Einladung nicht gefunden." };
  }

  if (invite.status !== "pending") {
    return { error: "Einladung ist nicht mehr offen." };
  }

  if ((user.email ?? "").toLowerCase() !== invite.invited_email.toLowerCase()) {
    return { error: "Diese Einladung gehört nicht zu deinem Account." };
  }

  const { error: memberError } = await supabase
    .from("group_members")
    .upsert({ group_id: invite.group_id, user_id: user.id, role: "member" }, { onConflict: "group_id,user_id" });
  if (memberError) {
    return { error: memberError.message };
  }

  const { error: updateError } = await supabase
    .from("group_invites")
    .update({ status: "accepted", accepted_by: user.id, accepted_at: new Date().toISOString() })
    .eq("id", invite.id);
  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  return { success: true };
}

export async function createManagedMember(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();
  const groupId = String(formData.get("groupId") || "").trim();
  const usernameRaw = String(formData.get("name") || "").trim();
  const username = normalizeManagedIdentifier(usernameRaw);
  const password = String(formData.get("password") || "");

  if (!groupId || !username || !password) {
    return { error: "Benutzername und Passwort sind erforderlich." };
  }

  if (password.length < 8) {
    return { error: "Passwort muss mindestens 8 Zeichen haben." };
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return { error: "Nur Admins dürfen Nutzer anlegen." };
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return { error: "SUPABASE_SERVICE_ROLE_KEY fehlt in der Umgebung." };
  }

  const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const email = toManagedEmail(username);
  const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username, display_name: username, role: "member" }
  });

  if (createUserError || !createdUser.user) {
    return { error: createUserError?.message ?? "Nutzer konnte nicht erstellt werden." };
  }

  const newUserId = createdUser.user.id;

  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      user_id: newUserId,
      display_name: username
    },
    { onConflict: "user_id" }
  );
  if (profileError) {
    return { error: profileError.message };
  }

  const { error: memberError } = await adminClient.from("group_members").upsert(
    {
      group_id: groupId,
      user_id: newUserId,
      role: "member"
    },
    { onConflict: "group_id,user_id" }
  );
  if (memberError) {
    return { error: memberError.message };
  }

  revalidatePath(`/dashboard/groups/${groupId}/bands`);
  revalidatePath(`/dashboard/groups/${groupId}/notes`);
  revalidatePath("/dashboard");
  return { success: true, email };
}

export async function updateGroup(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const groupId = String(formData.get("groupId") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const avatarUrl = String(formData.get("avatarUrl") || "").trim();

  if (!groupId || !name) {
    return { error: "Gruppen-ID und Name sind erforderlich." };
  }

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return { error: "Nur Admins dürfen Gruppendaten bearbeiten." };
  }

  const { error } = await supabase
    .from("groups")
    .update({ name, avatar_url: avatarUrl || null })
    .eq("id", groupId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/groups/${groupId}`);
  revalidatePath("/dashboard/festivals");
  return { success: true };
}
