import Link from "next/link";
import { signOut } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";
import { isSystemAdminEmail } from "@/lib/auth/roles";
import { MainMenu } from "@/components/main-menu";
import { OfflineIndicator } from "@/components/offline-indicator";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();
  const isAdmin = isSystemAdminEmail(user.email);

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-6 py-8 pb-24 md:pb-8">
      <header className="mb-8 flex items-center justify-between rounded-lg border border-slate-300 bg-card p-4">
        <div className="flex items-center gap-3">
          <MainMenu isAdmin={isAdmin} />
          <Link className="text-lg font-bold" href="/dashboard">
            Festival Planner
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <OfflineIndicator />
          <Link href="/dashboard/profile" className="block" aria-label="Zum Profil">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profilbild" className="h-9 w-9 rounded-full border border-slate-300 object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-xs text-muted">
                {(profile?.display_name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
              </div>
            )}
          </Link>
          <form action={signOut}>
            <button className="rounded-md bg-slate-200 px-3 py-2 text-sm" type="submit">
              Logout
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
