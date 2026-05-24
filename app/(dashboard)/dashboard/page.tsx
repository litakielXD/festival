import Link from "next/link";
import { getRecentMessagesForUser, getUserFestivals } from "@/lib/supabase/queries";
import { formatDateRange } from "@/lib/format/date";

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 60%, 45%)`;
}

export default async function DashboardPage() {
  const [festivals, recentMessages] = await Promise.all([
    getUserFestivals(),
    getRecentMessagesForUser(8)
  ]);
  const today = new Date().toISOString().slice(0, 10);

  const upcomingFestivals = festivals
    .filter((festival) => (festival.starts_on ?? festival.ends_on ?? "9999-12-31") >= today)
    .sort((a, b) =>
      (a.starts_on ?? a.ends_on ?? "9999-12-31").localeCompare(
        b.starts_on ?? b.ends_on ?? "9999-12-31"
      )
    )
    .slice(0, 3);

  const pastFestivals = festivals
    .filter((festival) => (festival.ends_on ?? festival.starts_on ?? "0000-01-01") < today)
    .sort((a, b) =>
      (b.ends_on ?? b.starts_on ?? "0000-01-01").localeCompare(
        a.ends_on ?? a.starts_on ?? "0000-01-01"
      )
    )
    .slice(0, 3);

  const latestMessages = recentMessages.slice(0, 5);

  return (
    <main className="space-y-8">
      {!festivals.length ? (
        <section className="festival-card rounded-2xl p-8 text-center bg-white dark:bg-slate-950">
          <p className="text-5xl animate-bounce">🎪</p>
          <h2 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100">Noch kein Festival zugewiesen</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-md mx-auto">
            Dein Konto ist aktiv, aber du bist noch keinem Festival zugewiesen.
            Bitte wende dich an einen Admin, damit du Zugang erhältst.
          </p>
        </section>
      ) : null}

      <section className="grid gap-6 md:grid-cols-3">
        {/* 1. Kommende Festivals */}
        <article className="festival-card rounded-2xl p-5 bg-white dark:bg-slate-950 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
              Kommende Festivals
            </h2>
            <div className="space-y-3">
              {upcomingFestivals.map((festival) => (
                <Link
                  key={festival.id}
                  href={`/dashboard/festivals/${festival.id}/timeline`}
                  className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-200 active:scale-[0.99] dark:bg-slate-900/40 dark:border-slate-850 dark:hover:border-slate-700"
                >
                  {festival.avatar_url ? (
                    <img
                      src={festival.avatar_url}
                      alt={festival.name}
                      className="h-10 w-10 rounded-full border border-slate-200 object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm shrink-0"
                      style={{ backgroundColor: getAvatarColor(festival.name) }}
                    >
                      {getInitials(festival.name)}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="font-semibold text-sm text-slate-850 dark:text-slate-250 truncate">{festival.name}</p>
                    <p className="text-xs text-slate-400">{formatDateRange(festival.starts_on, festival.ends_on)}</p>
                  </div>
                </Link>
              ))}
              {!upcomingFestivals.length ? (
                <p className="text-sm text-slate-400 py-4 text-center">Keine kommenden Festivals.</p>
              ) : null}
            </div>
          </div>
          <div className="pt-2">
            <Link
              href="/dashboard/festivals"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              Alle Festivals anzeigen →
            </Link>
          </div>
        </article>

        {/* 2. Vergangene Festivals */}
        <article className="festival-card rounded-2xl p-5 bg-white dark:bg-slate-950 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
              Vergangene Festivals
            </h2>
            <div className="space-y-3">
              {pastFestivals.map((festival) => (
                <Link
                  key={festival.id}
                  href={`/dashboard/festivals/${festival.id}/timeline`}
                  className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-200 active:scale-[0.99] dark:bg-slate-900/40 dark:border-slate-850 dark:hover:border-slate-700"
                >
                  {festival.avatar_url ? (
                    <img
                      src={festival.avatar_url}
                      alt={festival.name}
                      className="h-10 w-10 rounded-full border border-slate-200 object-cover shrink-0 animate-none filter grayscale opacity-80"
                    />
                  ) : (
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm shrink-0 filter grayscale opacity-75"
                      style={{ backgroundColor: getAvatarColor(festival.name) }}
                    >
                      {getInitials(festival.name)}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="font-semibold text-sm text-slate-650 dark:text-slate-350 truncate">{festival.name}</p>
                    <p className="text-xs text-slate-400">{formatDateRange(festival.starts_on, festival.ends_on)}</p>
                  </div>
                </Link>
              ))}
              {!pastFestivals.length ? (
                <p className="text-sm text-slate-400 py-4 text-center">Keine vergangenen Festivals.</p>
              ) : null}
            </div>
          </div>
          <div className="pt-2">
            <Link
              href="/dashboard/festivals"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              Alle Festivals anzeigen →
            </Link>
          </div>
        </article>

        {/* 3. Neueste Nachrichten */}
        <article className="festival-card rounded-2xl p-5 bg-white dark:bg-slate-950 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
              Neueste Nachrichten
            </h2>
            <div className="space-y-3">
              {latestMessages.map((message) => (
                <Link
                  key={message.id}
                  href={`/dashboard/festivals/${message.festival_id}`}
                  className="block rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-indigo-200 active:scale-[0.99] dark:bg-slate-900/40 dark:border-slate-850 dark:hover:border-slate-700"
                >
                  <p className="font-bold text-xs text-indigo-600 dark:text-indigo-400 truncate mb-1">
                    {message.festival_name}
                  </p>
                  <p className="text-xs text-slate-400 mb-1 leading-none font-medium">
                    {message.sender_name} an {message.recipient_name}
                  </p>
                  <p className="text-slate-700 dark:text-slate-350 text-sm line-clamp-2 mt-1">
                    {message.content}
                  </p>
                </Link>
              ))}
              {!latestMessages.length ? (
                <p className="text-sm text-slate-400 py-4 text-center">Keine Nachrichten vorhanden.</p>
              ) : null}
            </div>
          </div>
          <div className="pt-2">
            <Link
              href="/dashboard/festivals"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              Alle Festival-Nachrichten anzeigen →
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
