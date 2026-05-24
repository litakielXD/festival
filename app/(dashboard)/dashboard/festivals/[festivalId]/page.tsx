import { FestivalNav } from "@/components/festival-nav";
import { getFestivalContext } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/server";
import { FestivalChatInterface } from "@/components/festival-chat-interface";

export default async function FestivalHomePage({ params }: { params: Promise<{ festivalId: string }> }) {
  const { festivalId } = await params;
  const { festival, members, currentUserId } = await getFestivalContext(festivalId);

  const supabase = await createClient();
  const { data: messages } = await supabase
    .from("festival_direct_messages")
    .select("id,sender_id,recipient_id,content,created_at")
    .eq("festival_id", festivalId)
    .order("created_at", { ascending: true }) // Chronological sorting for chat history
    .limit(100);

  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">{festival.name} - Chat</h1>
      <FestivalNav festivalId={festivalId} />

      <FestivalChatInterface
        festivalId={festivalId}
        currentUserId={currentUserId}
        members={members}
        initialMessages={messages ?? []}
      />
    </main>
  );
}
