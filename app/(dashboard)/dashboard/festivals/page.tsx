import Link from "next/link";
import Image from "next/image";
import { getUserFestivals } from "@/lib/supabase/queries";
import { requireUser } from "@/lib/auth/guards";
import { formatDateRange } from "@/lib/format/date";

export default async function FestivalsPage() {
  await requireUser();
  const festivals = await getUserFestivals();

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">Festivals</h1>

      <section className="rounded-lg border border-slate-300 bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Deine Festivals</h2>
        <div className="space-y-2">
          {festivals.map((festival) => (
            <article key={festival.id} className="rounded-md border border-slate-300 p-3">
              {festival.avatar_url ? (
                <Image src={festival.avatar_url} alt={festival.name} width={40} height={40} className="mb-2 h-10 w-10 rounded-full border border-slate-300 object-cover" />
              ) : null}
              <Link href={`/dashboard/festivals/${festival.id}/timeline`} className="font-medium hover:underline">
                {festival.name}
              </Link>
              <p className="text-sm text-muted">
                {formatDateRange(festival.starts_on, festival.ends_on)}
                {festival.location ? ` | ${festival.location}` : ""}
              </p>
            </article>
          ))}
          {!festivals.length ? <p className="text-sm text-muted">Noch keine Festivals vorhanden.</p> : null}
        </div>
      </section>
    </main>
  );
}
