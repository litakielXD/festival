import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/guards";

export async function getUserGroups() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: membershipData, error: membershipError } = await supabase
    .from("group_members")
    .select("role, groups(id,name,created_by)")
    .eq("user_id", user.id);

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  // Fallback for freshly created groups: show groups owned by the user
  // even if membership insertion did not complete yet.
  const { data: ownedGroups, error: ownedGroupsError } = await supabase
    .from("groups")
    .select("id,name,created_by")
    .eq("created_by", user.id);

  if (ownedGroupsError) {
    throw new Error(ownedGroupsError.message);
  }

  const membershipEntries =
    membershipData?.map((row) => ({
      role: row.role as "admin" | "member",
      group: Array.isArray(row.groups) ? row.groups[0] : row.groups
    })) ?? [];

  const membershipGroupIds = new Set(
    membershipEntries.map((entry) => entry.group?.id).filter(Boolean) as string[]
  );

  const ownerFallbackEntries =
    ownedGroups
      ?.filter((group) => !membershipGroupIds.has(group.id))
      .map((group) => ({
        role: "admin" as const,
        group
      })) ?? [];

  return [...membershipEntries, ...ownerFallbackEntries].filter((entry) => Boolean(entry.group));
}

export async function getGroupContext(groupId: string) {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: membership } = await supabase
    .from("group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    throw new Error("No access to this group.");
  }

  const { data: group } = await supabase.from("groups").select("id,name").eq("id", groupId).single();
  const { data: days } = await supabase
    .from("festival_days")
    .select("id,date,label")
    .eq("group_id", groupId)
    .order("date", { ascending: true });
  const { data: bands } = await supabase
    .from("bands")
    .select("id,name,genre,created_by")
    .eq("group_id", groupId)
    .order("name", { ascending: true });

  return {
    role: membership.role as "admin" | "member",
    group,
    days: days ?? [],
    bands: bands ?? []
  };
}
