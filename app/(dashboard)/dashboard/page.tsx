import Link from "next/link";
import { getRecentMessagesForUser, getUserFestivals } from "@/lib/supabase/queries";
import { formatDateRange } from "@/lib/format/date";

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
        <section className="festival-card rounded-xl p-6 text-center">
          <p className="text-4xl">🎪</p>
          <h2 className="mt-3 text-lg font-semibold">Noch kein Festival zugewiesen</h2>
          <p className="mt-2 text-sm text-muted">
            Dein Konto ist aktiv, aber du bist noch keinem Festival zugewiesen.
            Bitte wende dich an einen Admin, damit du Zugang erhältst.
          </p>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-slate-300 bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold">Kommende Festivals</h2>
          <div className="space-y-2 text-sm">
            {upcomingFestivals.map((festival) => (
              <Link
                key={festival.id}
                href={`/dashboard/festivals/${festival.id}/timeline`}
                className="block rounded-md border border-slate-300 p-2 hover:bg-slate-100"
              >
                {festival.avatar_url ? (
                  <img
                    src={festival.avatar_url}
                    alt={festival.name}
                    className="mb-1 h-8 w-8 rounded-full border border-slate-300 object-cover"
                  />
                ) : null}
                <p className="font-medium">{festival.name}</p>
                <p className="text-muted">{formatDateRange(festival.starts_on, festival.ends_on)}</p>
              </Link>
            ))}
            {!upcomingFestivals.length ? (
              <p className="text-muted">Keine kommenden Festivals.</p>
            ) : null}
          </div>
          <div className="mt-3">
            <Link href="/dashboard/festivals" className="text-sm text-accent hover:underline">
              Alle Festivals anzeigen
            </Link>
          </div>
        </article>

        <article className="rounded-lg border border-slate-300 bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold">Vergangene Festivals</h2>
          <div className="space-y-2 text-sm">
            {pastFestivals.map((festival) => (
              <Link
                key={festival.id}
                href={`/dashboard/festivals/${festival.id}/timeline`}
                className="block rounded-md border border-slate-300 p-2 hover:bg-slate-100"
              >
                {festival.avatar_url ? (
                  <img
                    src={festival.avatar_url}
                    alt={festival.name}
                    className="mb-1 h-8 w-8 rounded-full border border-slate-300 object-cover"
                  />
                ) : null}
                <p className="font-medium">{festival.name}</p>
                <p className="text-muted">{formatDateRange(festival.starts_on, festival.ends_on)}</p>
              </Link>
            ))}
            {!pastFestivals.length ? (
              <p className="text-muted">Keine vergangenen Festivals.</p>
            ) : null}
          </div>
          <div className="mt-3">
            <Link href="/dashboard/festivals" className="text-sm text-accent hover:underline">
              Alle Festivals anzeigen
            </Link>
          </div>
        </article>

        <article className="rounded-lg border border-slate-300 bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold">Neueste Nachrichten</h2>
          <div className="space-y-2 text-sm">
            {latestMessages.map((message) => (
              <Link
                key={message.id}
                href={`/dashboard/festivals/${message.festival_id}`}
                className="block rounded-md border border-slate-300 p-2 hover:bg-slate-100"
              >
                <p className="font-medium">{message.festival_name}</p>
                <p className="text-xs text-muted">
                  {message.sender_name} an {message.recipient_name}
                </p>
                <p className="line-clamp-2">{message.content}</p>
              </Link>
            ))}
            {!latestMessages.length ? (
              <p className="text-muted">Keine Nachrichten vorhanden.</p>
            ) : null}
          </div>
          <div className="mt-3">
            <Link href="/dashboard/festivals" className="text-sm text-accent hover:underline">
              Alle Festival-Nachrichten anzeigen
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
