import { acceptGroupInvite, joinGroup } from "@/lib/actions/groups";
import { upsertProfile } from "@/lib/actions/profile";
import { getProfileOverview } from "@/lib/supabase/queries";
import { AvatarUploadField } from "@/components/avatar-upload-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatDateLong } from "@/lib/format/date";

export default async function ProfilePage() {
  const { user, profile, invites } = await getProfileOverview();

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">Profil</h1>
      <section className="rounded-lg border border-slate-300 bg-card p-4">
        <p className="text-sm text-muted">Eingeloggt als</p>
        <p className="font-medium">{user.email}</p>
      </section>

      <section className="rounded-lg border border-slate-300 bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Profil bearbeiten</h2>
        <form
          action={async (formData) => {
            "use server";
            await upsertProfile(formData);
          }}
          className="space-y-3"
        >
          <AvatarUploadField userId={user.id} initialAvatarUrl={profile.avatar_url} />
          <Input name="username" placeholder="Benutzername" defaultValue={profile.display_name ?? ""} />
          <Button type="submit">Profil speichern</Button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-300 bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Gruppe beitreten</h2>
        <form
          action={async (formData) => {
            "use server";
            await joinGroup(formData);
          }}
          className="flex gap-2"
        >
          <Input name="groupId" placeholder="Gruppen-ID" required />
          <Button type="submit" variant="secondary">
            Beitreten
          </Button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-300 bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Einladungen</h2>
        <div className="space-y-2">
          {invites.map((invite) => (
            <div key={invite.id} className="flex items-center justify-between rounded-md border border-slate-300 p-3">
              <div>
                <p className="font-medium">{invite.group_name}</p>
                <p className="text-xs text-muted">Eingeladen am {formatDateLong(invite.created_at)}</p>
              </div>
              <form
                action={async (formData) => {
                  "use server";
                  await acceptGroupInvite(formData);
                }}
              >
                <input type="hidden" name="inviteId" value={invite.id} />
                <Button type="submit">Annehmen</Button>
              </form>
            </div>
          ))}
          {!invites.length ? <p className="text-sm text-muted">Keine offenen Einladungen.</p> : null}
        </div>
      </section>
    </main>
  );
}
