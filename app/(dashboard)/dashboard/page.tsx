import Link from "next/link";
import { createGroup, joinGroup } from "@/lib/actions/groups";
import { getUserGroups } from "@/lib/supabase/queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  const entries = await getUserGroups();

  return (
    <main className="space-y-8">
      <section className="rounded-lg bg-card p-5">
        <h1 className="mb-4 text-2xl font-semibold">Meine Gruppen</h1>
        <div className="space-y-3">
          {entries.map((entry) => (
            <Link
              key={entry.group.id}
              href={`/dashboard/groups/${entry.group.id}/timeline`}
              className="flex items-center justify-between rounded-md border border-slate-700 p-3"
            >
              <span>{entry.group.name}</span>
              <span className="text-sm text-muted">{entry.role}</span>
            </Link>
          ))}
          {!entries.length ? <p className="text-muted">Noch keine Gruppen vorhanden.</p> : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <form
          action={async (formData) => {
            "use server";
            await createGroup(formData);
          }}
          className="space-y-3 rounded-lg border border-slate-700 p-5"
        >
          <h2 className="text-lg font-semibold">Neue Gruppe erstellen</h2>
          <Input name="name" placeholder="Gruppenname" required />
          <Button type="submit">Erstellen</Button>
        </form>
        <form
          action={async (formData) => {
            "use server";
            await joinGroup(formData);
          }}
          className="space-y-3 rounded-lg border border-slate-700 p-5"
        >
          <h2 className="text-lg font-semibold">Gruppe beitreten</h2>
          <Input name="groupId" placeholder="Gruppen-ID" required />
          <Button type="submit" variant="secondary">
            Beitreten
          </Button>
        </form>
      </section>
    </main>
  );
}
