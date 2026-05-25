import { FestivalNav } from "@/components/festival-nav";
import { getFestivalContext } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { FestivalChatInterface } from "@/components/festival-chat-interface";

export default async function FestivalHomePage({ params }: { params: Promise<{ festivalId: string }> }) {
  const { festivalId } = await params;
  const { festival, members, currentUserId } = await getFestivalContext(festivalId);
  const memberNameMap = new Map((members ?? []).map((m) => [m.user_id, m.display_name]));

  const supabase = await createClient();

  const [dmsResult, groupMsgsResult] = await Promise.all([
    supabase
      .from("festival_direct_messages")
      .select("id,sender_id,recipient_id,content,created_at")
      .eq("festival_id", festivalId)
      .order("created_at", { ascending: true })
      .limit(100),
    supabase
      .from("festival_group_messages")
      .select("id,sender_id,content,created_at")
      .eq("festival_id", festivalId)
      .order("created_at", { ascending: true })
      .limit(100)
  ]);

  const directMessages = dmsResult.data ?? [];
  const groupMessages = (groupMsgsResult.data ?? []).map((msg) => ({
    id: msg.id,
    sender_id: msg.sender_id,
    content: msg.content,
    created_at: msg.created_at,
    sender_name: memberNameMap.get(msg.sender_id) ?? "Unbekannt"
  }));

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">{festival.name} - Chat</h1>
      <FestivalNav festivalId={festivalId} />

      <FestivalChatInterface
        festivalId={festivalId}
        currentUserId={currentUserId}
        members={members}
        initialDirectMessages={directMessages}
        initialGroupMessages={groupMessages}
      />
    </main>
  );
}
