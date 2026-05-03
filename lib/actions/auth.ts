"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { normalizeManagedIdentifier, toManagedEmail } from "@/lib/auth/identity";

export async function signInWithEmail(formData: FormData) {
  const identifier = String(formData.get("identifier") || formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const supabase = await createClient();
  let email = identifier.includes("@") ? identifier.toLowerCase() : "";

  if (!email) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false }
      });
      const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const normalizedIdentifier = normalizeManagedIdentifier(identifier);
      const match = (users?.users ?? []).find((user) => {
        const userEmail = (user.email ?? "").toLowerCase();
        const emailLocal = userEmail.split("@")[0] ?? "";
        const emailShort = emailLocal.split(".")[0] ?? emailLocal;
        const username = String(user.user_metadata?.username ?? "").trim();
        const displayName = String(user.user_metadata?.display_name ?? "").trim();
        return (
          normalizeManagedIdentifier(username) === normalizedIdentifier ||
          normalizeManagedIdentifier(displayName) === normalizedIdentifier ||
          normalizeManagedIdentifier(emailLocal) === normalizedIdentifier ||
          normalizeManagedIdentifier(emailShort) === normalizedIdentifier
        );
      });
      email = (match?.email ?? "").toLowerCase();
    }
  }

  if (!email) {
    email = toManagedEmail(identifier);
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUpWithEmail(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const username = normalizeManagedIdentifier(String(formData.get("username") || "").trim());
  const supabase = await createClient();

  if (!username) {
    return { error: "Benutzername ist erforderlich." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, display_name: username, role: "member" } }
  });
  if (error || !data.user) {
    return { error: error?.message ?? "Konto konnte nicht erstellt werden." };
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ user_id: data.user.id, display_name: username }, { onConflict: "user_id" });
  if (profileError) {
    return { error: profileError.message };
  }

  return { message: "Konto erstellt. Bitte prüfe deine E-Mail für die Bestätigung." };
}

function isManagedLocalEmail(email: string) {
  return email.toLowerCase().endsWith("@festival.local");
}

async function getBaseUrl() {
  const hdrs = await headers();
  const forwardedProto = hdrs.get("x-forwarded-proto");
  const forwardedHost = hdrs.get("x-forwarded-host");
  const host = hdrs.get("host");
  const proto = forwardedProto ?? "http";
  const resolvedHost = forwardedHost ?? host ?? "localhost:3000";
  return `${proto}://${resolvedHost}`;
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: "Bitte eine gültige E-Mail-Adresse eingeben." };
  }
  if (isManagedLocalEmail(email)) {
    return { error: "Für lokale Accounts ohne echte E-Mail ist Passwort-Reset per Mail nicht verfügbar." };
  }

  const supabase = await createClient();
  const redirectTo = `${await getBaseUrl()}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    return { error: error.message };
  }

  return { message: "Wenn ein Konto existiert, wurde eine E-Mail zum Zurücksetzen gesendet." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
