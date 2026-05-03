import { deleteDirectMessage, sendGroupDirectMessage } from "@/lib/actions/messages";
import { createGroupInvite, updateGroup } from "@/lib/actions/groups";
import { getGroupPeopleAndMessages } from "@/lib/supabase/queries";
import { AvatarUploadField } from "@/components/avatar-upload-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function GroupHomePage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const { group, members, messages, currentUserId } = await getGroupPeopleAndMessages(groupId);
  const currentMember = members.find((m) => m.user_id === currentUserId);
  const isAdmin = currentMember?.role === "admin";

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">{group?.name} - Gruppe</h1>

      {isAdmin ? (
        <section className="rounded-lg border border-slate-300 bg-card p-4">
          <h2 className="mb-3 text-lg font-semibold">Gruppe bearbeiten</h2>
          <form
            action={async (formData) => {
              "use server";
              await updateGroup(formData);
            }}
            className="space-y-3"
          >
            <input type="hidden" name="groupId" value={groupId} />
            <AvatarUploadField userId={currentUserId} fieldName="avatarUrl" label="Gruppenbild" pathPrefix="groups" initialAvatarUrl={group?.avatar_url ?? null} />
            <Input name="name" defaultValue={group?.name ?? ""} required />
            <Button type="submit">Gruppendaten speichern</Button>
          </form>
        </section>
      ) : null}

      <section className="rounded-lg border border-slate-300 bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Mitglieder</h2>
        {isAdmin ? (
          <form
            action={async (formData) => {
              "use server";
              await createGroupInvite(formData);
            }}
            className="mb-4 flex gap-2"
          >
            <input type="hidden" name="groupId" value={groupId} />
            <Input name="invitedEmail" type="email" placeholder="Member per E-Mail einladen" required />
            <Button type="submit">Einladen</Button>
          </form>
        ) : null}
        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.user_id} className="rounded-md border border-slate-300 p-3">
              <p className="font-medium">
                {member.display_name} <span className="text-sm text-muted">({member.role})</span>
              </p>
              {member.user_id !== currentUserId ? (
                <form
                  action={async (formData) => {
                    "use server";
                    await sendGroupDirectMessage(formData);
                  }}
                  className="mt-2 flex gap-2"
                >
                  <input type="hidden" name="groupId" value={groupId} />
                  <input type="hidden" name="recipientId" value={member.user_id} />
                  <Input name="content" placeholder={`Nachricht an ${member.display_name}`} required />
                  <Button type="submit" variant="secondary">
                    Senden
                  </Button>
                </form>
              ) : null}
            </div>
          ))}
          {!members.length ? <p className="text-sm text-muted">Noch keine Mitglieder vorhanden.</p> : null}
        </div>
      </section>

      <section className="rounded-lg border border-slate-300 bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Nachrichten</h2>
        <div className="space-y-2">
          {messages.map((message) => {
            const from = members.find((m) => m.user_id === message.sender_id)?.display_name ?? "Unbekannt";
            const to = members.find((m) => m.user_id === message.recipient_id)?.display_name ?? "Unbekannt";
            return (
              <article key={message.id} className="rounded-md border border-slate-300 p-3">
                <p className="text-xs text-muted">
                  von {from} an {to}
                </p>
                <p>{message.content}</p>
                {message.sender_id === currentUserId ? (
                  <form
                    action={async (formData) => {
                      "use server";
                      await deleteDirectMessage(formData);
                    }}
                    className="mt-2"
                  >
                    <input type="hidden" name="groupId" value={groupId} />
                    <input type="hidden" name="messageId" value={message.id} />
                    <Button type="submit" variant="danger">
                      Nachricht loeschen
                    </Button>
                  </form>
                ) : null}
              </article>
            );
          })}
          {!messages.length ? <p className="text-sm text-muted">Noch keine Nachrichten vorhanden.</p> : null}
        </div>
      </section>
    </main>
  );
}
