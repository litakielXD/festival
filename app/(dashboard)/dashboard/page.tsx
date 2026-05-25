import Link from "next/link";
import { getRecentMessagesForUser, getUserFestivals } from "@/lib/supabase/queries";
import { formatDateRange } from "@/lib/format/date";
import { LinkifiedText } from "@/components/linkified-text";

function getInitials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 55%, 42%)`;
}

function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

type Festival = {
  id: string;
  name: string;
  avatar_url?: string | null;
  starts_on?: string | null;
  ends_on?: string | null;
};

function FestivalBannerCard({
  festival,
  past = false
}: {
  festival: Festival;
  past?: boolean;
}) {
  const days = daysUntil(festival.starts_on);
  const showCountdown = !past && days !== null && days >= 0 && days <= 30;

  return (
    <Link
      href={`/dashboard/festivals/${festival.id}/timeline`}
      className="group block overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 hover:border-accent/50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative h-28 overflow-hidden bg-slate-200 dark:bg-slate-800">
        {festival.avatar_url ? (
          <img
            src={festival.avatar_url}
            alt={festival.name}
            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${past ? "grayscale opacity-70" : ""}`}
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center text-3xl font-black text-white ${past ? "grayscale opacity-70" : ""}`}
            style={{ backgroundColor: getAvatarColor(festival.name) }}
          >
            {getInitials(festival.name)}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {showCountdown && (
          <span className="absolute right-2 top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white shadow">
            {days === 0 ? "Heute!" : `In ${days}T`}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className={`truncate text-sm font-semibold ${past ? "text-muted" : ""}`}>{festival.name}</p>
        <p className="mt-0.5 text-xs text-muted">{formatDateRange(festival.starts_on, festival.ends_on)}</p>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const [festivals, recentMessages] = await Promise.all([
    getUserFestivals(),
    getRecentMessagesForUser(8)
  ]);
  const today = new Date().toISOString().slice(0, 10);

  const upcomingFestivals = festivals
    .filter((f) => (f.starts_on ?? f.ends_on ?? "9999-12-31") >= today)
    .sort((a, b) =>
      (a.starts_on ?? a.ends_on ?? "9999-12-31").localeCompare(b.starts_on ?? b.ends_on ?? "9999-12-31")
    )
    .slice(0, 3);

  const pastFestivals = festivals
    .filter((f) => (f.ends_on ?? f.starts_on ?? "0000-01-01") < today)
    .sort((a, b) =>
      (b.ends_on ?? b.starts_on ?? "0000-01-01").localeCompare(a.ends_on ?? a.starts_on ?? "0000-01-01")
    )
    .slice(0, 3);

  const latestMessages = recentMessages.slice(0, 5);

  return (
    <main className="space-y-8">
      {!festivals.length ? (
        <section className="festival-card rounded-2xl p-10 text-center">
          <p className="text-5xl">🎪</p>
          <h2 className="mt-4 text-xl font-bold font-display">Noch kein Festival zugewiesen</h2>
          <p className="mt-2 text-sm text-muted max-w-sm mx-auto">
            Dein Konto ist aktiv. Ein Admin weist dich bald einem Festival zu — dann geht es los.
          </p>
        </section>
      ) : null}

      <section className="grid gap-6 md:grid-cols-3">
        {/* Kommende Festivals */}
        <article className="festival-card rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-base font-bold font-display pb-2 border-b border-slate-100 dark:border-slate-800">
              Kommende Festivals
            </h2>
            <div className="space-y-3">
              {upcomingFestivals.map((festival) => (
                <FestivalBannerCard key={festival.id} festival={festival} />
              ))}
              {!upcomingFestivals.length && (
                <p className="py-4 text-center text-sm text-muted">Keine kommenden Festivals.</p>
              )}
            </div>
          </div>
          <Link
            href="/dashboard/festivals"
            className="text-xs font-semibold text-accent hover:underline underline-offset-2 transition-colors"
          >
            Alle Festivals →
          </Link>
        </article>

        {/* Vergangene Festivals */}
        <article className="festival-card rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-base font-bold font-display pb-2 border-b border-slate-100 dark:border-slate-800">
              Vergangene Festivals
            </h2>
            <div className="space-y-3">
              {pastFestivals.map((festival) => (
                <FestivalBannerCard key={festival.id} festival={festival} past />
              ))}
              {!pastFestivals.length && (
                <p className="py-4 text-center text-sm text-muted">Keine vergangenen Festivals.</p>
              )}
            </div>
          </div>
          <Link
            href="/dashboard/festivals"
            className="text-xs font-semibold text-accent hover:underline underline-offset-2 transition-colors"
          >
            Alle Festivals →
          </Link>
        </article>

        {/* Neueste Nachrichten */}
        <article className="festival-card rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-base font-bold font-display pb-2 border-b border-slate-100 dark:border-slate-800">
              Neueste Nachrichten
            </h2>
            <div className="space-y-2">
              {latestMessages.map((message) => (
                <Link
                  key={message.id}
                  href={`/dashboard/festivals/${message.festival_id}`}
                  className="block rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-accent/30 dark:bg-slate-900/40 dark:border-slate-800"
                >
                  <p className="text-[11px] font-bold text-accent truncate">{message.festival_name}</p>
                  <p className="text-[11px] text-muted font-medium leading-tight">
                    {message.sender_name} → {message.recipient_name}
                  </p>
                  <p className="mt-1 text-sm line-clamp-2"><LinkifiedText text={message.content} /></p>
                </Link>
              ))}
              {!latestMessages.length && (
                <p className="py-4 text-center text-sm text-muted">Noch keine Nachrichten.</p>
              )}
            </div>
          </div>
          <Link
            href="/dashboard/festivals"
            className="text-xs font-semibold text-accent hover:underline underline-offset-2 transition-colors"
          >
            Alle Festival-Nachrichten →
          </Link>
        </article>
      </section>
    </main>
  );
}
