import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { isSystemAdminEmail } from "@/lib/auth/roles";
import { getUserGroups } from "@/lib/supabase/queries";

export default async function GroupsPage() {
  const user = await requireUser();
  if (!isSystemAdminEmail(user.email)) {
    redirect("/dashboard/festivals");
  }

  const groups = await getUserGroups();

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Gruppen</h1>
      <section className="rounded-lg border border-slate-300 bg-card p-4">
        <div className="space-y-2">
          {groups.map((entry) => (
            <Link key={entry.group.id} href={`/dashboard/groups/${entry.group.id}`} className="flex items-center justify-between rounded-md border border-slate-300 p-3 hover:bg-slate-100">
              <span>{entry.group.name}</span>
              <span className="text-sm text-muted">{entry.role}</span>
            </Link>
          ))}
          {!groups.length ? <p className="text-sm text-muted">Du bist aktuell in keiner Gruppe.</p> : null}
        </div>
      </section>
    </main>
  );
}
