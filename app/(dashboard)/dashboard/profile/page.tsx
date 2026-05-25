import { createClient } from "@/lib/supabase/server";
import { getProfileOverview } from "@/lib/supabase/queries";
import { ProfileSettingsForm } from "@/components/profile-settings-form";
import { formatDateLong } from "@/lib/format/date";
import Link from "next/link";
import Image from "next/image";

export default async function ProfilePage() {
  const { user, profile } = await getProfileOverview();
  const supabase = await createClient();

  // Query user's assigned festivals with full details
  const { data: userFestivals } = await supabase
    .from("festival_members")
    .select("role, festivals(id, name, avatar_url, location, starts_on, ends_on)")
    .eq("user_id", user.id);

  const festivals = (userFestivals ?? [])
    .map((uf) => {
      const f = Array.isArray(uf.festivals) ? uf.festivals[0] : uf.festivals;
      if (!f) return null;
      return {
        id: f.id,
        name: f.name,
        avatar_url: f.avatar_url,
        location: f.location,
        starts_on: f.starts_on,
        ends_on: f.ends_on,
        role: uf.role
      };
    })
    .filter(Boolean) as Array<{
      id: string;
      name: string;
      avatar_url: string | null;
      location: string | null;
      starts_on: string | null;
      ends_on: string | null;
      role: string;
    }>;

  // Sort festivals by start date (upcoming first)
  festivals.sort((a, b) => {
    if (!a.starts_on) return 1;
    if (!b.starts_on) return -1;
    return new Date(a.starts_on).getTime() - new Date(b.starts_on).getTime();
  });

  return (
    <main className="space-y-8 max-w-6xl mx-auto px-4 py-2">
      
      {/* Title Header with Subtitle */}
      <div className="flex flex-col gap-1.5 border-b border-slate-200/60 pb-5 dark:border-slate-800/60">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent dark:from-white dark:to-slate-300">
          Profilzentrale
        </h1>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Passe deine Zugangsdaten an und verschaffe dir einen Überblick über deine Festivals.
        </p>
      </div>

      {/* Account Info Bar */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/50 p-5 shadow-sm backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/40">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Eingeloggt als</p>
            <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{user.email}</p>
          </div>
          <span className="mt-2 w-max rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 sm:mt-0">
            ✓ Account Aktiv
          </span>
        </div>
      </section>

      {/* Profile settings & Password Change */}
      <ProfileSettingsForm
        userId={user.id}
        initialUsername={profile.display_name ?? ""}
        initialAvatarUrl={profile.avatar_url}
      />

      {/* Festivals Section */}
      <section className="rounded-2xl border border-slate-200/80 bg-white/70 p-6 shadow-xl backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/60 dark:shadow-2xl">
        <h3 className="mb-4 text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100">
          Meine Festivals
        </h3>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {festivals.map((festival) => (
            <Link
              key={festival.id}
              href={`/dashboard/festivals/${festival.id}/timeline`}
              className="group flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-md dark:border-slate-800/80 dark:bg-slate-950/30 dark:hover:border-slate-700"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  {festival.avatar_url ? (
                    <Image
                      src={festival.avatar_url}
                      alt={festival.name}
                      width={44}
                      height={44}
                      className="h-11 w-11 rounded-full object-cover shadow-sm ring-2 ring-slate-100 dark:ring-slate-800"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {festival.name.substring(0, 2)}
                    </div>
                  )}
                  
                  {/* Role Badge */}
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm ${
                      festival.role === "admin"
                        ? "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                        : "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                    }`}
                  >
                    {festival.role === "admin" ? "🎪 Admin" : "👤 Mitglied"}
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 group-hover:text-accent transition-colors dark:text-slate-100">
                    {festival.name}
                  </h4>
                  {festival.location ? (
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      📍 {festival.location}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-0.5">
                      Kein Ort hinterlegt
                    </p>
                  )}
                </div>
              </div>

              {/* Card Footer: Dates */}
              <div className="mt-4 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500 dark:border-slate-800/80 dark:text-slate-400 flex justify-between">
                <span>Zeitraum:</span>
                <span className="font-semibold">
                  {festival.starts_on
                    ? `${formatDateLong(festival.starts_on)}`
                    : "kein Datum"}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {festivals.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
            Du bist aktuell noch keinem Festival zugewiesen.
          </div>
        )}
      </section>

    </main>
  );
}

