import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { AvatarUploadField } from "@/components/avatar-upload-field";
import { FestivalMemberAssignmentForm } from "@/components/festival-member-assignment-form";
import { FestivalMemberRoleForm } from "@/components/festival-member-role-form";
import { createFestival, updateFestival } from "@/lib/actions/festivals";
import { removeFestivalMember } from "@/lib/actions/festival";
import {
  adminAddFestivalBandSlot,
  adminCreatePerson,
  adminDeleteFestival,
  adminDeletePerson,
  adminUpdatePersonPassword
} from "@/lib/actions/admin";
import { requireUser } from "@/lib/auth/guards";
import { isSystemAdminEmail } from "@/lib/auth/roles";
import { getAdminOverview } from "@/lib/supabase/queries";

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
  const peopleEmailById = new Map(peopleOptions.map((entry) => [entry.user_id, entry.email]));
  const peopleNameById = new Map(authUsers.map((entry) => [entry.id, entry.username]));

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">Adminbereich</h1>

      <nav className="flex gap-2 rounded-lg border border-slate-300 bg-card p-2 text-sm">
        <a
          href="/dashboard/admin?tab=personen"
          className={`rounded px-3 py-2 hover:bg-slate-100 ${activeTab === "personen" ? "bg-slate-100 font-medium" : ""}`}
        >
          Personen
        </a>
        <a
          href="/dashboard/admin?tab=festivals"
          className={`rounded px-3 py-2 hover:bg-slate-100 ${activeTab === "festivals" ? "bg-slate-100 font-medium" : ""}`}
        >
          Festivals
        </a>
      </nav>

      {(() => {
        const tab = activeTab;
        if (tab !== "personen") return null;
        return (
          <section id="personen" className="space-y-4 rounded-lg border border-slate-300 bg-card p-4">
        <h2 className="text-lg font-semibold">Personen</h2>

        <form
          action={async (formData) => {
            "use server";
            await adminCreatePerson(formData);
          }}
          className="space-y-3 rounded-lg border border-slate-300 p-4"
        >
          <h3 className="font-semibold">Person anlegen</h3>
          <input className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm" name="username" placeholder="Benutzername" required />
          <input className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm" name="email" placeholder="E-Mail (optional)" />
          <input className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm" type="password" name="password" placeholder="Passwort" required />
          <button className="rounded-md bg-accent px-3 py-2 text-sm font-semibold" type="submit">
            Person anlegen
          </button>
        </form>

        <div className="space-y-2">
          <h3 className="font-semibold">Personen verwalten</h3>
          <div className="rounded-md border border-slate-300">
            <div className="grid grid-cols-[minmax(120px,1fr)_minmax(220px,1.4fr)_minmax(180px,1.2fr)_auto] gap-2 border-b border-slate-300 bg-slate-100 px-2 py-1 text-xs font-semibold text-muted">
              <span>Benutzername</span>
              <span>E-Mail</span>
              <span>Passwort neu setzen</span>
              <span>Aktion</span>
            </div>
            {authUsers.map((person) => (
              <div key={person.id} className="grid grid-cols-[minmax(120px,1fr)_minmax(220px,1.4fr)_minmax(180px,1.2fr)_auto] items-center gap-2 border-b border-slate-300 px-2 py-1.5 text-sm last:border-b-0">
                <div className="truncate font-medium">{person.username}</div>
                <div className="truncate text-muted">{person.email || "Keine E-Mail"}</div>
                <form
                  action={async (formData) => {
                    "use server";
                    await adminUpdatePersonPassword(formData);
                  }}
                  className="flex items-center gap-1"
                >
                  <input type="hidden" name="userId" value={person.id} />
                  <input
                    className="h-8 w-full rounded border border-slate-300 bg-slate-100 px-2 text-xs"
                    type="password"
                    name="password"
                    placeholder="Neues Passwort"
                    required
                  />
                  <button className="h-8 rounded border border-slate-300 px-2 text-xs hover:bg-slate-100" type="submit">
                    Speichern
                  </button>
                </form>
                <form
                  action={async (formData) => {
                    "use server";
                    await adminDeletePerson(formData);
                  }}
                >
                  <input type="hidden" name="userId" value={person.id} />
                  <button className="h-8 rounded border border-slate-300 px-2 text-xs hover:bg-slate-100" type="submit">
                    Löschen
                  </button>
                </form>
              </div>
            ))}
          </div>
          {!authUsers.length ? <p className="text-sm text-muted">Keine Personen gefunden.</p> : null}
        </div>
          </section>
        );
      })()}

      {(() => {
        const tab = activeTab;
        if (tab !== "festivals") return null;
        return (
          <>
      <section id="festivals" className="space-y-4 rounded-lg border border-slate-300 bg-card p-4">
        <h2 className="text-lg font-semibold">Festivals</h2>

        <form
          action={async (formData) => {
            "use server";
            await createFestival(formData);
          }}
          className="space-y-3 rounded-lg border border-slate-300 p-4"
        >
          <h3 className="font-semibold">Festival erstellen</h3>
          <AvatarUploadField userId={user.id} label="Festivalbild" fieldName="avatarUrl" pathPrefix="festivals" />
          <input className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm" name="name" placeholder="Festivalname" required />
          <button className="rounded-md bg-accent px-3 py-2 text-sm font-semibold" type="submit">
            Festival anlegen
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-300 bg-card p-4">
        <h3 className="mb-3 font-semibold">Festivals verwalten</h3>
        <div className="space-y-3">
          {festivals.map((festival) => (
            <details key={festival.id} name="festival-accordion" className="rounded-md border border-slate-300 p-3">
              <summary className="cursor-pointer font-medium">{festival.name}</summary>
              <div className="mt-2 rounded-md border border-slate-300 bg-slate-50 p-2 text-sm">
                <p className="mb-1 font-medium">Bereits zugewiesene Personen</p>
                {festival.members?.length ? (
                  <div className="space-y-1">
                    <div className="grid grid-cols-[minmax(140px,1fr)_minmax(220px,1.4fr)_auto] gap-2 rounded border border-slate-300 bg-slate-100 px-2 py-1 text-xs font-semibold text-muted">
                      <span>Name</span>
                      <span>E-Mail</span>
                      <span>Rolle / Aktion</span>
                    </div>
                    <ul className="space-y-1">
                    {festival.members.map((member) => (
                      <li key={`${festival.id}-${member.user_id}`} className="grid grid-cols-[minmax(140px,1fr)_minmax(220px,1.4fr)_auto] items-center gap-2 rounded border border-slate-300 bg-card px-2 py-1">
                        <span className="truncate text-xs font-medium">
                          {peopleNameById.get(member.user_id) ?? member.display_name}
                        </span>
                        <span className="truncate text-xs text-muted">
                          {peopleEmailById.get(member.user_id) ?? "keine E-Mail"}
                        </span>
                        <div className="flex items-center gap-2">
                          <FestivalMemberRoleForm
                            festivalId={festival.id}
                            memberId={member.user_id}
                            defaultRole={member.role === "admin" ? "admin" : "member"}
                          />
                          <form
                            action={async (formData) => {
                              "use server";
                              await removeFestivalMember(formData);
                            }}
                          >
                            <input type="hidden" name="festivalId" value={festival.id} />
                            <input type="hidden" name="memberId" value={member.user_id} />
                            <button className="h-7 rounded border border-slate-300 px-2 text-xs hover:bg-slate-100" type="submit">
                              Entfernen
                            </button>
                          </form>
                        </div>
                      </li>
                    ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-muted">Noch keine Personen zugewiesen.</p>
                )}
              </div>
              <form
                action={async (formData) => {
                  "use server";
                  await updateFestival(formData);
                }}
                className="mt-3 space-y-2 rounded-md border border-slate-300 p-3"
              >
                <input type="hidden" name="festivalId" value={festival.id} />
                <AvatarUploadField
                  userId={user.id}
                  fieldName="avatarUrl"
                  label="Festivalbild bearbeiten"
                  pathPrefix="festivals"
                  initialAvatarUrl={festival.avatar_url ?? null}
                />
                <input className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm" name="name" defaultValue={festival.name} required />
                <div className="grid gap-2 md:grid-cols-2">
                  <input
                    className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm"
                    type="date"
                    name="startsOn"
                    defaultValue={festival.starts_on ?? ""}
                  />
                  <input
                    className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm"
                    type="date"
                    name="endsOn"
                    defaultValue={festival.ends_on ?? ""}
                  />
                </div>
                <input
                  className="w-full rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm"
                  name="location"
                  defaultValue={festival.location ?? ""}
                  placeholder="Ort"
                />
                <button className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100" type="submit">
                  Festival speichern
                </button>
              </form>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <FestivalMemberAssignmentForm festivalId={festival.id} people={peopleOptions} />

                <form
                  action={async (formData) => {
                    "use server";
                    await adminAddFestivalBandSlot(formData);
                  }}
                  className="grid gap-2"
                >
                  <input type="hidden" name="festivalId" value={festival.id} />
                  <input className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm" name="bandName" placeholder="Bandname" required />
                  <div className="grid gap-2 md:grid-cols-2">
                    <input className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm" type="date" name="dayDate" required />
                    <input className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm" name="dayLabel" placeholder="Tag-Label (optional)" />
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <input className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm" type="datetime-local" name="startsAt" required />
                    <input className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm" type="datetime-local" name="endsAt" required />
                  </div>
                  <input className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm" name="stage" placeholder="Stage (optional)" />
                  <button className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100" type="submit">
                    Band + Slot hinzufügen
                  </button>
                </form>
              </div>

              <form
                action={async (formData) => {
                  "use server";
                  await adminDeleteFestival(formData);
                }}
                className="mt-3"
              >
                <input type="hidden" name="festivalId" value={festival.id} />
                <button className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100" type="submit">
                  Festival löschen
                </button>
              </form>
            </details>
          ))}
        </div>
      </section>
          </>
        );
      })()}
    </main>
  );
}
