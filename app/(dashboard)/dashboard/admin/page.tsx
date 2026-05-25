import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth/guards";
import { isSystemAdminEmail } from "@/lib/auth/roles";
import { getAdminOverview } from "@/lib/supabase/queries";
import { AdminPeopleList } from "@/components/admin-people-list";
import { AdminFestivalsList } from "@/components/admin-festivals-list";

export default async function AdminPage({
  searchParams
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const activeTab = resolvedSearchParams?.tab === "festivals" ? "festivals" : "personen";
  const user = await requireUser();
  if (!isSystemAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  const { festivals } = await getAdminOverview();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY fehlt.");
  }
  const adminClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  
  const { data: userList } = await adminClient.auth.admin.listUsers();
  
  const authUsers = (userList?.users ?? [])
    .map((entry) => {
      const email = entry.email ?? "";
      const emailLocal = email.includes("@") ? (email.split("@")[0] ?? "").split(".")[0] : "";
      const username =
        String(entry.user_metadata?.username ?? "").trim() ||
        emailLocal ||
        "Unbekannt";
      const displayName =
        String(entry.user_metadata?.display_name ?? "").trim() || username;
      return {
        id: entry.id,
        username,
        displayName,
        email
      };
    })
    .sort((a, b) => a.username.localeCompare(b.username));

  const peopleOptions = (userList?.users ?? [])
    .map((entry) => ({
      user_id: entry.id,
      display_name: String(
        entry.user_metadata?.username ??
          entry.user_metadata?.display_name ??
          (entry.email?.split("@")[0] ?? "").split(".")[0] ??
          "Unbekannt"
      ),
      email: entry.email ?? ""
    }))
    .filter((entry) => Boolean(entry.email));

  // Build maps as plain JS objects for seamless client component serialization
  const peopleNameMap: Record<string, string> = {};
  const peopleEmailMap: Record<string, string> = {};
  authUsers.forEach((entry) => {
    peopleNameMap[entry.id] = entry.username;
    peopleEmailMap[entry.id] = entry.email;
  });

  return (
    <main className="space-y-8 max-w-6xl mx-auto px-4 py-2">
      {/* Title Header with Subtitle */}
      <div className="flex flex-col gap-1.5 border-b border-slate-200/60 pb-5 dark:border-slate-800/60">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-white dark:to-slate-300">
          Adminbereich
        </h1>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Verwalte die Mitglieder, plane Festivals und weise Band-Slots zu.
        </p>
      </div>

      {/* Modern Premium HSL Tab-Navigation */}
      <nav className="flex w-max items-center gap-1.5 rounded-2xl border border-slate-200/80 bg-white/50 p-1.5 shadow-sm backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/40">
        <a
          href="/dashboard/admin?tab=personen"
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold tracking-wide transition-all duration-200 ${
            activeTab === "personen"
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10 dark:bg-slate-100 dark:text-slate-900 dark:shadow-none"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-white"
          }`}
        >
          👤 Personen
        </a>
        <a
          href="/dashboard/admin?tab=festivals"
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold tracking-wide transition-all duration-200 ${
            activeTab === "festivals"
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10 dark:bg-slate-100 dark:text-slate-900 dark:shadow-none"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/40 dark:hover:text-white"
          }`}
        >
          🎪 Festivals
        </a>
      </nav>

      {/* Render the selected premium client view */}
      {activeTab === "personen" ? (
        <AdminPeopleList authUsers={authUsers} />
      ) : (
        <AdminFestivalsList
          festivals={festivals}
          peopleOptions={peopleOptions}
          peopleNameMap={peopleNameMap}
          peopleEmailMap={peopleEmailMap}
          userId={user.id}
        />
      )}
    </main>
  );
}

