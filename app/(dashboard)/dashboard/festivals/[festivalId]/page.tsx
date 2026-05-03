import { deleteFestivalMessage, sendFestivalMessage } from "@/lib/actions/festival";
import { FestivalNav } from "@/components/festival-nav";
import { getFestivalContext } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function FestivalHomePage({ params }: { params: Promise<{ festivalId: string }> }) {
  const { festivalId } = await params;
  const { festival, members, currentUserId } = await getFestivalContext(festivalId);

  const supabase = await createClient();
  const { data: messages } = await supabase
    .from("festival_direct_messages")
    .select("id,sender_id,recipient_id,content,created_at")
    .eq("festival_id", festivalId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-semibold">{festival.name} - Mitglieder & Nachrichten</h1>
      <FestivalNav festivalId={festivalId} />

      <section className="rounded-lg border border-slate-300 bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Festival-Mitglieder</h2>
        <div className="space-y-3">
          {members.map((member) => (
            <div key={member.user_id} className="rounded-md border border-slate-300 p-3">
              <div className="flex items-center justify-between">
                <p className="font-medium">
                  {member.display_name} <span className="text-sm text-muted">({member.role})</span>
                </p>
              </div>
              {member.user_id !== currentUserId ? (
                <form
                  action={async (formData) => {
                    "use server";
                    await sendFestivalMessage(formData);
                  }}
                  className="mt-2 flex gap-2"
                >
                  <input type="hidden" name="festivalId" value={festivalId} />
                  <input type="hidden" name="recipientId" value={member.user_id} />
                  <Input name="content" placeholder={`Nachricht an ${member.display_name}`} required />
                  <Button type="submit" variant="secondary">
                    Senden
                  </Button>
                </form>
              ) : null}
            </div>
          ))}
          {!members.length ? <p className="text-sm text-muted">Noch keine Mitglieder zugewiesen.</p> : null}
        </div>
      </section>

      <section className="rounded-lg border border-slate-300 bg-card p-4">
        <h2 className="mb-3 text-lg font-semibold">Nachrichten</h2>
        <div className="space-y-2">
          {(messages ?? []).map((message) => {
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
                      await deleteFestivalMessage(formData);
                    }}
                    className="mt-2"
                  >
                    <input type="hidden" name="festivalId" value={festivalId} />
                    <input type="hidden" name="messageId" value={message.id} />
                    <Button type="submit" variant="danger">
                      Nachricht loeschen
                    </Button>
                  </form>
                ) : null}
              </article>
            );
          })}
          {!(messages ?? []).length ? <p className="text-sm text-muted">Noch keine Nachrichten vorhanden.</p> : null}
        </div>
      </section>
    </main>
  );
}
