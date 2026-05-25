"use client";

import { useEffect, useRef, useState, useTransition, useMemo } from "react";
import { LinkifiedText } from "@/components/linkified-text";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  sendFestivalMessage,
  deleteFestivalMessage,
  sendFestivalGroupMessage,
  deleteFestivalGroupMessage
} from "@/lib/actions/festival";
import { toast } from "@/components/ui/toast";

type MemberItem = {
  user_id: string;
  display_name: string;
  role: string;
};

type MessageItem = {
  id: string;
  sender_id: string;
  recipient_id?: string;
  content: string;
  created_at: string;
  sender_name?: string;
};

interface FestivalChatInterfaceProps {
  festivalId: string;
  currentUserId: string;
  members: MemberItem[];
  initialDirectMessages: MessageItem[];
  initialGroupMessages: MessageItem[];
}

// Generate consistent HSL color based on string hash
function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 65%, 45%)`;
}

function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return (parts[0][0]! + parts[1][0]!).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatChatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function formatChatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return "Heute";
    }
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) {
      return "Gestern";
    }
    return d.toLocaleDateString("de-DE", { day: "numeric", month: "long" });
  } catch {
    return "";
  }
}

export function FestivalChatInterface({
  festivalId,
  currentUserId,
  members,
  initialDirectMessages,
  initialGroupMessages
}: FestivalChatInterfaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Exclude current user from the chat-partners list
  const otherMembers = members.filter((m) => m.user_id !== currentUserId);
  
  // Select "group" as active chat room on mount
  const [activeChatId, setActiveChatId] = useState<string>("group");

  const [inputContent, setInputContent] = useState("");
  
  // Optimistic messages
  const [optimisticDMs, setOptimisticDMs] = useState<MessageItem[]>([]);
  const [optimisticGroupMsgs, setOptimisticGroupMsgs] = useState<MessageItem[]>([]);

  // Realtime received messages
  const [realtimeDMs, setRealtimeDMs] = useState<MessageItem[]>([]);
  const [realtimeGroupMsgs, setRealtimeGroupMsgs] = useState<MessageItem[]>([]);

  const activePartner = members.find((m) => m.user_id === activeChatId);

  // Realtime WebSocket Subscription
  useEffect(() => {
    const supabase = createClient();

    // 1. Shared Group Messages WebSocket Channel
    const groupChannel = supabase
      .channel(`festival-group-messages-${festivalId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "festival_group_messages",
          filter: `festival_id=eq.${festivalId}`
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new as MessageItem;
            const sender = members.find((m) => m.user_id === newMsg.sender_id);
            const enrichedMsg: MessageItem = {
              id: newMsg.id,
              sender_id: newMsg.sender_id,
              content: newMsg.content,
              created_at: newMsg.created_at,
              sender_name: sender ? sender.display_name : "Mitglied"
            };

            setRealtimeGroupMsgs((prev) => {
              if (prev.some((m) => m.id === enrichedMsg.id)) return prev;
              return [...prev, enrichedMsg];
            });

            if (newMsg.sender_id !== currentUserId) {
              router.refresh();
            }
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            setRealtimeGroupMsgs((prev) => prev.filter((m) => m.id !== deletedId));
            setOptimisticGroupMsgs((prev) => prev.filter((m) => m.id !== deletedId));
            router.refresh();
          }
        }
      )
      .subscribe();

    // 2. Direct Messages WebSocket Channel
    const dmChannel = supabase
      .channel(`festival-dm-messages-${festivalId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "festival_direct_messages",
          filter: `festival_id=eq.${festivalId}`
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new as MessageItem;
            const enrichedMsg: MessageItem = {
              id: newMsg.id,
              sender_id: newMsg.sender_id,
              recipient_id: newMsg.recipient_id,
              content: newMsg.content,
              created_at: newMsg.created_at
            };

            setRealtimeDMs((prev) => {
              if (prev.some((m) => m.id === enrichedMsg.id)) return prev;
              return [...prev, enrichedMsg];
            });

            if (newMsg.sender_id !== currentUserId) {
              router.refresh();
              // Alert user if message is from someone else and they are in another chat tab
              if (activeChatId !== newMsg.sender_id) {
                const sender = members.find((m) => m.user_id === newMsg.sender_id);
                toast.info(`Neue Nachricht von ${sender ? sender.display_name : "Mitglied"}.`);
              }
            }
          } else if (payload.eventType === "DELETE") {
            const deletedId = payload.old.id;
            setRealtimeDMs((prev) => prev.filter((m) => m.id !== deletedId));
            setOptimisticDMs((prev) => prev.filter((m) => m.id !== deletedId));
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(groupChannel);
      void supabase.removeChannel(dmChannel);
    };
  }, [festivalId, currentUserId, members, router, activeChatId]);

  // Sync and filter chat messages for selected conversation
  const chatMessages = useMemo(() => {
    if (activeChatId === "group") {
      const all = [...initialGroupMessages, ...realtimeGroupMsgs, ...optimisticGroupMsgs];
      const uniqueMap = new Map<string, MessageItem>();
      all.forEach((msg) => uniqueMap.set(msg.id, msg));
      return Array.from(uniqueMap.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    } else {
      const all = [...initialDirectMessages, ...realtimeDMs, ...optimisticDMs];
      const uniqueMap = new Map<string, MessageItem>();
      all.forEach((msg) => uniqueMap.set(msg.id, msg));
      const sorted = Array.from(uniqueMap.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      return sorted.filter(
        (msg) =>
          (msg.sender_id === currentUserId && msg.recipient_id === activeChatId) ||
          (msg.sender_id === activeChatId && msg.recipient_id === currentUserId)
      );
    }
  }, [
    initialDirectMessages,
    initialGroupMessages,
    realtimeDMs,
    realtimeGroupMsgs,
    optimisticDMs,
    optimisticGroupMsgs,
    currentUserId,
    activeChatId
  ]);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, activeChatId]);

  // Clear optimistic/realtime messages that are now fully propagated from the server components
  useEffect(() => {
    const savedIds = new Set(initialDirectMessages.map((m) => m.id));
    setOptimisticDMs((prev) => prev.filter((m) => !savedIds.has(m.id)));
    setRealtimeDMs((prev) => prev.filter((m) => !savedIds.has(m.id)));
  }, [initialDirectMessages]);

  useEffect(() => {
    const savedIds = new Set(initialGroupMessages.map((m) => m.id));
    setOptimisticGroupMsgs((prev) => prev.filter((m) => !savedIds.has(m.id)));
    setRealtimeGroupMsgs((prev) => prev.filter((m) => !savedIds.has(m.id)));
  }, [initialGroupMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputContent.trim();
    if (!content || !activeChatId) return;

    setInputContent("");
    const tempId = `optimistic-${Date.now()}`;

    if (activeChatId === "group") {
      const myProfile = members.find((m) => m.user_id === currentUserId);
      const newMsg: MessageItem = {
        id: tempId,
        sender_id: currentUserId,
        content,
        created_at: new Date().toISOString(),
        sender_name: myProfile?.display_name ?? "Ich"
      };

      setOptimisticGroupMsgs((prev) => [...prev, newMsg]);

      const formData = new FormData();
      formData.append("festivalId", festivalId);
      formData.append("content", content);

      startTransition(async () => {
        const res = await sendFestivalGroupMessage(formData);
        if (res && "error" in res) {
          setOptimisticGroupMsgs((prev) => prev.filter((m) => m.id !== tempId));
          setInputContent(content);
          toast.error(res.error || "Fehler beim Senden der Gruppen-Nachricht.");
        } else {
          router.refresh();
        }
      });
    } else {
      const newMsg: MessageItem = {
        id: tempId,
        sender_id: currentUserId,
        recipient_id: activeChatId,
        content,
        created_at: new Date().toISOString()
      };

      setOptimisticDMs((prev) => [...prev, newMsg]);

      const formData = new FormData();
      formData.append("festivalId", festivalId);
      formData.append("recipientId", activeChatId);
      formData.append("content", content);

      startTransition(async () => {
        const res = await sendFestivalMessage(formData);
        if (res && "error" in res) {
          setOptimisticDMs((prev) => prev.filter((m) => m.id !== tempId));
          setInputContent(content);
          toast.error(res.error || "Fehler beim Senden der privaten Nachricht.");
        } else {
          router.refresh();
        }
      });
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    const formData = new FormData();
    formData.append("festivalId", festivalId);
    formData.append("messageId", messageId);

    if (activeChatId === "group") {
      setOptimisticGroupMsgs((prev) => prev.filter((m) => m.id !== messageId));

      startTransition(async () => {
        const res = await deleteFestivalGroupMessage(formData);
        if (res && "error" in res) {
          toast.error(res.error || "Fehler beim Löschen der Nachricht.");
          router.refresh();
        } else {
          toast.success("Nachricht erfolgreich gelöscht.");
          router.refresh();
        }
      });
    } else {
      setOptimisticDMs((prev) => prev.filter((m) => m.id !== messageId));

      startTransition(async () => {
        const res = await deleteFestivalMessage(formData);
        if (res && "error" in res) {
          toast.error(res.error || "Fehler beim Löschen der Nachricht.");
          router.refresh();
        } else {
          toast.success("Nachricht erfolgreich gelöscht.");
          router.refresh();
        }
      });
    }
  };

  // Group messages by date to render premium headers (e.g., "Heute", "Gestern", "24. Mai")
  const groupedMessages = useMemo(() => {
    const groups: Array<{ dateLabel: string; items: MessageItem[] }> = [];
    let currentGroup: { dateLabel: string; items: MessageItem[] } | null = null;

    chatMessages.forEach((msg: MessageItem) => {
      const label = formatChatDate(msg.created_at);
      if (!currentGroup || currentGroup.dateLabel !== label) {
        currentGroup = { dateLabel: label, items: [] };
        groups.push(currentGroup);
      }
      currentGroup.items.push(msg);
    });

    return groups;
  }, [chatMessages]);

  return (
    <section className="grid gap-6 md:grid-cols-3 h-[600px] rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-md dark:border-slate-800 dark:bg-slate-950">
      
      {/* 1. Left Sidebar: Festival Channels & Members */}
      <div className="md:col-span-1 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full bg-slate-50/30 dark:bg-slate-950/20">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold text-slate-800 dark:text-slate-200">Festivalmitglieder</h3>
          <p className="text-xs text-muted">Chatte in der Gruppe oder privat</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* A. Shared Group Chatroom Button */}
          <button
            type="button"
            onClick={() => setActiveChatId("group")}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
              activeChatId === "group"
                ? "bg-indigo-50 text-indigo-900 shadow-sm dark:bg-indigo-950/40 dark:text-indigo-200"
                : "hover:bg-slate-100/80 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-900/50"
            }`}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white shadow-sm shrink-0 bg-gradient-to-tr from-indigo-500 to-cyan-500">
              📢
            </div>
            <div className="text-left overflow-hidden">
              <p className="font-semibold text-sm truncate">Festival-Gruppe</p>
              <p className="text-xs text-indigo-500 font-semibold truncate dark:text-indigo-400">Gemeinsamer Chat</p>
            </div>
          </button>

          <div className="my-2 border-t border-slate-200 dark:border-slate-800/80" />

          {/* B. Private Member DM Buttons */}
          {otherMembers.map((member) => {
            const isActive = activeChatId === member.user_id;
            return (
              <button
                key={member.user_id}
                type="button"
                onClick={() => setActiveChatId(member.user_id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-indigo-50 text-indigo-900 shadow-sm dark:bg-indigo-950/40 dark:text-indigo-200"
                    : "hover:bg-slate-100/80 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-900/50"
                }`}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm shrink-0"
                  style={{ backgroundColor: getAvatarColor(member.display_name) }}
                >
                  {getInitials(member.display_name)}
                </div>
                <div className="text-left overflow-hidden">
                  <p className="font-medium text-sm truncate">{member.display_name}</p>
                  <p className="text-xs text-muted-foreground capitalize truncate">{member.role}</p>
                </div>
              </button>
            );
          })}
          {!otherMembers.length && (
            <p className="text-sm text-center py-8 text-muted">Keine anderen Mitglieder im Festival.</p>
          )}
        </div>
      </div>

      {/* 2. Right Main Panel: Active Conversation View */}
      <div className="md:col-span-2 flex flex-col h-full bg-white dark:bg-slate-950">
        {activeChatId === "group" || activePartner ? (
          <>
            {/* Active Conversation Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 shrink-0">
              {activeChatId === "group" ? (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-bold text-white shadow-sm shrink-0 bg-gradient-to-tr from-indigo-500 to-cyan-500">
                    📢
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                      Festival-Gruppe
                    </h4>
                    <p className="text-xs text-muted-foreground">Offener Channel für alle Festivalmitglieder</p>
                  </div>
                </>
              ) : activePartner ? (
                <>
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm shrink-0"
                    style={{ backgroundColor: getAvatarColor(activePartner.display_name) }}
                  >
                    {getInitials(activePartner.display_name)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                      {activePartner.display_name}
                    </h4>
                    <p className="text-xs text-muted-foreground capitalize">{activePartner.role}</p>
                  </div>
                </>
              ) : null}
            </div>

            {/* Chat Messages List (Scrolling) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {groupedMessages.map((group: { dateLabel: string; items: MessageItem[] }) => (
                <div key={group.dateLabel} className="space-y-4">
                  {/* Date Header Pill */}
                  <div className="flex justify-center">
                    <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                      {group.dateLabel}
                    </span>
                  </div>

                  {/* Messages bubbles */}
                  {group.items.map((msg: MessageItem) => {
                    const isSelf = msg.sender_id === currentUserId;
                    const senderName = msg.sender_name || (activePartner ? activePartner.display_name : "Mitglied");
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isSelf ? "justify-end" : "justify-start"} items-end gap-2 group`}
                      >
                        {!isSelf && (
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-bold text-white shrink-0 mb-1"
                            style={{ backgroundColor: getAvatarColor(senderName) }}
                          >
                            {getInitials(senderName)}
                          </div>
                        )}
                        <div className="max-w-[70%] space-y-0.5">
                          {activeChatId === "group" && !isSelf && (
                            <span className="block text-[10px] font-bold text-slate-500 pl-1 dark:text-slate-400">
                              {senderName}
                            </span>
                          )}
                          <div
                            className={`px-4 py-2.5 text-sm rounded-2xl relative shadow-sm break-words transition-all duration-200 ${
                              isSelf
                                ? "bg-indigo-600 text-white rounded-tr-none"
                                : "bg-slate-100 text-slate-800 rounded-tl-none dark:bg-slate-800 dark:text-slate-200"
                            }`}
                          >
                            <LinkifiedText text={msg.content} className="break-words" />
                            
                            {/* Optimistic Sending Spinner */}
                            {msg.id.toString().startsWith("optimistic-") && (
                              <span className="absolute -left-5 top-1/2 -translate-y-1/2 flex h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                            )}
                          </div>
                          <div className={`flex items-center gap-2 ${isSelf ? "justify-end" : "justify-start"} px-1`}>
                            <span className="text-[9px] text-slate-400 tracking-wider">
                              {formatChatTime(msg.created_at)}
                            </span>
                            {isSelf && !msg.id.toString().startsWith("optimistic-") && (
                              <button
                                type="button"
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="opacity-0 group-hover:opacity-100 text-[10px] text-rose-500 hover:text-rose-700 transition-opacity"
                                title="Nachricht löschen"
                              >
                                Löschen
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 text-xl">
                    💬
                  </div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Keine Nachrichten vorhanden</p>
                  <p className="text-xs text-muted">
                    {activeChatId === "group" 
                      ? "Schreibe die erste Nachricht in der Festival-Gruppe!"
                      : `Schreibe eine private Nachricht an ${activePartner?.display_name ?? "dieses Mitglied"}.`}
                  </p>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Sticky Chat Input Bar */}
            <form
              onSubmit={handleSendMessage}
              className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2 shrink-0 bg-slate-50/50 dark:bg-slate-950/40"
            >
              <input
                type="text"
                placeholder={
                  activeChatId === "group"
                    ? "Nachricht an Festival-Gruppe schreiben..."
                    : `Nachricht an ${activePartner?.display_name ?? "Mitglied"} schreiben...`
                }
                value={inputContent}
                onChange={(e) => setInputContent(e.target.value)}
                disabled={isPending}
                required
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 transition-all"
              />
              <button
                type="submit"
                disabled={isPending || !inputContent.trim()}
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-all shrink-0"
              >
                Senden
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-2">
            <div className="text-4xl">👥</div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Kein Chatpartner ausgewählt</p>
            <p className="text-xs text-muted">Wähle links ein Mitglied aus, um eine Unterhaltung zu beginnen.</p>
          </div>
        )}
      </div>

    </section>
  );
}
