import Link from "next/link";
import { signOut } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";
import { isSystemAdminEmail } from "@/lib/auth/roles";
import { MainMenu } from "@/components/main-menu";
import { OfflineIndicator } from "@/components/offline-indicator";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccentToggle } from "@/components/accent-toggle";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();
  const isAdmin = isSystemAdminEmail(user.email);
  const appName = process.env.NEXT_PUBLIC_APP_NAME || "Festival Planner";

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-6 py-8 pb-24 md:pb-8">
      <header className="mb-8 flex items-center justify-between rounded-xl border border-slate-200 bg-card/80 p-4 shadow-sm backdrop-blur dark:border-slate-800">
        <div className="flex items-center gap-3">
          <MainMenu isAdmin={isAdmin} />
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-lg font-black tracking-tight font-display hover:text-accent transition-colors"
          >
            <span className="text-xl">🎪</span>
            <span>{appName}</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <OfflineIndicator />
          <AccentToggle />
          <ThemeToggle />
          <Link href="/dashboard/profile" className="block" aria-label="Zum Profil">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Profilbild"
                className="h-9 w-9 rounded-full border border-slate-300 object-cover dark:border-slate-700"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-slate-100 text-xs font-bold text-muted dark:border-slate-700 dark:bg-slate-800">
                {(profile?.display_name ?? user.email ?? "U").slice(0, 1).toUpperCase()}
              </div>
            )}
          </Link>
          <form action={signOut}>
            <button
              className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
              type="submit"
            >
              Logout
            </button>
          </form>
        </div>
      </header>
      {children}
    </div>
  );
}
