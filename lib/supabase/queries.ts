import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireUser } from "@/lib/auth/guards";
import { isSystemAdminEmail } from "@/lib/auth/roles";

function fallbackUserLabel(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  return text || "Unbekannt";
}

async function resolveUserNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[]
) {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const nameById = new Map<string, string>();
  if (!uniqueIds.length) return nameById;

  const { data: profiles } = await supabase.from("profiles").select("user_id,display_name").in("user_id", uniqueIds);
  for (const profile of profiles ?? []) {
    const label = String(profile.display_name ?? "").trim();
    if (label) nameById.set(profile.user_id, label);
  }

  const missingIds = uniqueIds.filter((id) => !nameById.has(id));
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (missingIds.length && serviceRoleKey) {
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: authUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const authUser of authUsers?.users ?? []) {
      if (!missingIds.includes(authUser.id)) continue;
      const metadataUsername = String(authUser.user_metadata?.username ?? "").trim();
      const metadataDisplayName = String(authUser.user_metadata?.display_name ?? "").trim();
      const emailLocal = String(authUser.email ?? "").split("@")[0] ?? "";
      const emailShort = emailLocal.split(".")[0] ?? emailLocal;
      const resolved = metadataUsername || metadataDisplayName || emailShort || emailLocal;
      if (resolved) nameById.set(authUser.id, resolved);
    }
  }

  return nameById;
}


export async function getUserFestivals() {
  await requireUser();
  const supabase = await createClient();

  // RLS on festivals already restricts visibility to:
  // - created_by = auth.uid()
  // - or user is in a group assigned to the festival.
  // So a single festivals select is enough here.
  const { data: visibleFestivals, error: festivalsError } = await supabase
    .from("festivals")
    .select("id,name,starts_on,ends_on,location,avatar_url,created_by")
    .order("name", { ascending: true });

  if (festivalsError) {
    throw new Error(festivalsError.message);
  }

  type FestivalEntry = {
    id: string;
    name: string;
    starts_on: string | null;
    ends_on: string | null;
    location: string | null;
    avatar_url: string | null;
    created_by: string;
    groups?: Array<{ id: string; name: string }>;
    members?: Array<{ user_id: string; role: "admin" | "member"; display_name: string }>;
  };

  const festivalList: FestivalEntry[] = (visibleFestivals ?? []) as FestivalEntry[];
  const festivalIds = festivalList.map((festival) => festival.id);
  if (festivalIds.length) {
    const [{ data: assignments }, { data: members }, { data: profiles }] = await Promise.all([
      supabase
      .from("festival_groups")
      .select("festival_id,groups(id,name)")
      .in("festival_id", festivalIds),
      supabase.from("festival_members").select("festival_id,user_id,role").in("festival_id", festivalIds),
      supabase.from("profiles").select("user_id,display_name")
    ]);

    const groupsByFestivalId = new Map<string, Array<{ id: string; name: string }>>();
    for (const row of assignments ?? []) {
      const group = Array.isArray(row.groups) ? row.groups[0] : row.groups;
      if (!group) continue;
      const current = groupsByFestivalId.get(row.festival_id) ?? [];
      current.push({ id: group.id, name: group.name });
      groupsByFestivalId.set(row.festival_id, current);
    }

    for (const festivalId of festivalIds) {
      const festival = festivalList.find((entry) => entry.id === festivalId);
      if (!festival) continue;
      festival.groups = groupsByFestivalId.get(festivalId) ?? [];
    }

    const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile.display_name]));
    const membersByFestivalId = new Map<
      string,
      Array<{ user_id: string; role: "admin" | "member"; display_name: string }>
    >();

    for (const member of members ?? []) {
      const current = membersByFestivalId.get(member.festival_id) ?? [];
      current.push({
        user_id: member.user_id,
        role: member.role as "admin" | "member",
        display_name: fallbackUserLabel(profileMap.get(member.user_id))
      });
      membersByFestivalId.set(member.festival_id, current);
    }

    for (const festivalId of festivalIds) {
      const festival = festivalList.find((entry) => entry.id === festivalId);
      if (!festival) continue;
      festival.members = membersByFestivalId.get(festivalId) ?? [];
    }
  }

  return festivalList;
}


export async function getRecentMessagesForUser(limit = 8) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: messages, error } = await supabase
    .from("festival_direct_messages")
    .select("id,festival_id,sender_id,recipient_id,content,created_at,festivals(name)")
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  const userIds = Array.from(
    new Set((messages ?? []).flatMap((message) => [message.sender_id, message.recipient_id]))
  );
  const nameByUserId = await resolveUserNames(supabase, userIds);

  return (messages ?? []).map((message) => ({
    ...message,
    sender_name:
      message.sender_id === user.id
        ? "Ich"
        : fallbackUserLabel(nameByUserId.get(message.sender_id)),
    recipient_name:
      message.recipient_id === user.id
        ? "Ich"
        : fallbackUserLabel(nameByUserId.get(message.recipient_id)),
    festival_name: (Array.isArray(message.festivals) ? message.festivals[0] : message.festivals)?.name ?? "Festival"
  }));
}

export async function getFestivalContext(festivalId: string) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: festival, error: festivalError } = await supabase
    .from("festivals")
    .select("id,name,starts_on,ends_on,location,avatar_url,created_by")
    .eq("id", festivalId)
    .single();

  if (festivalError || !festival) {
    throw new Error(festivalError?.message ?? "Festival nicht gefunden.");
  }

  const { data: membership } = await supabase
    .from("festival_members")
    .select("role")
    .eq("festival_id", festivalId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (festival.created_by !== user.id && !membership) {
    throw new Error("No access to this festival.");
  }

  const { data: assignments, error: assignmentsError } = await supabase
    .from("festival_groups")
    .select("group_id")
    .eq("festival_id", festivalId);

  if (assignmentsError) {
    throw new Error(assignmentsError.message);
  }

  const uniqueGroupIds = Array.from(new Set((assignments ?? []).map((row) => row.group_id).filter(Boolean)));
  const groups = uniqueGroupIds.map((groupId) => ({ id: groupId, name: "Festivalgruppe" }));

  const { data: members } = await supabase
    .from("festival_members")
    .select("user_id,role")
    .eq("festival_id", festivalId)
    .order("created_at", { ascending: true });

  const memberUserIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = memberUserIds.length
    ? await supabase.from("profiles").select("user_id,display_name,avatar_url").in("user_id", memberUserIds)
    : { data: [] as Array<{ user_id: string; display_name: string | null; avatar_url: string | null }> };
  const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));
  const authNameById = new Map<string, string>();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey && memberUserIds.length) {
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: authUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const authUser of authUsers?.users ?? []) {
      if (!memberUserIds.includes(authUser.id)) continue;
      const metadataUsername = String(authUser.user_metadata?.username ?? "").trim();
      const metadataDisplayName = String(authUser.user_metadata?.display_name ?? "").trim();
      const emailLocal = String(authUser.email ?? "").split("@")[0] ?? "";
      const emailShort = emailLocal.split(".")[0] ?? emailLocal;
      const resolved = metadataUsername || metadataDisplayName || emailShort || emailLocal;
      if (resolved) authNameById.set(authUser.id, resolved);
    }
  }

  const memberList =
    members?.map((member) => ({
      user_id: member.user_id,
      role: member.role as "admin" | "member",
      display_name:
        profileMap.get(member.user_id)?.display_name ??
        authNameById.get(member.user_id) ??
        "Unbekannt",
      avatar_url: profileMap.get(member.user_id)?.avatar_url ?? null
    })) ?? [];

  return { festival, groups, members: memberList, currentUserId: user.id, currentUserFestivalRole: (membership?.role as "admin" | "member" | undefined) ?? (festival.created_by === user.id ? "admin" : "member") };
}

export async function getProfileOverview() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    user,
    profile: profile ?? { display_name: null, avatar_url: null }
  };
}

export async function getAdminOverview() {
  const user = await requireUser();
  if (!isSystemAdminEmail(user.email)) {
    throw new Error("Kein Zugriff auf Adminbereich.");
  }

  const supabase = await createClient();

  const [{ data: festivals }, { data: profiles }, { data: festivalMembers }] = await Promise.all([
    supabase.from("festivals").select("id,name,avatar_url,starts_on,ends_on,location,created_at").order("created_at", { ascending: false }),
    supabase.from("profiles").select("user_id,display_name,avatar_url").order("user_id", { ascending: true }),
    supabase.from("festival_members").select("festival_id,user_id,role").order("created_at", { ascending: true })
  ]);

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.user_id, profile]));
  const authNameById = new Map<string, string>();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    const admin = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const { data: authUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const authUser of authUsers?.users ?? []) {
      const metadataUsername = String(authUser.user_metadata?.username ?? "").trim();
      const metadataDisplayName = String(authUser.user_metadata?.display_name ?? "").trim();
      const emailLocal = String(authUser.email ?? "").split("@")[0] ?? "";
      const emailShort = emailLocal.split(".")[0] ?? emailLocal;
      const resolved = metadataUsername || metadataDisplayName || emailShort || emailLocal;
      if (resolved) authNameById.set(authUser.id, resolved);
    }
  }
  const membersByFestival = new Map<
    string,
    Array<{ user_id: string; role: "admin" | "member"; display_name: string }>
  >();

  for (const member of festivalMembers ?? []) {
    const current = membersByFestival.get(member.festival_id) ?? [];
    const profile = profileMap.get(member.user_id);
    current.push({
      user_id: member.user_id,
      role: member.role as "admin" | "member",
      display_name: fallbackUserLabel(profile?.display_name ?? authNameById.get(member.user_id))
    });
    membersByFestival.set(member.festival_id, current);
  }

  const festivalsWithMembers =
    festivals?.map((festival) => ({
      ...festival,
      members: membersByFestival.get(festival.id) ?? []
    })) ?? [];

  return {
    festivals: festivalsWithMembers,
    people: profiles ?? []
  };
}
