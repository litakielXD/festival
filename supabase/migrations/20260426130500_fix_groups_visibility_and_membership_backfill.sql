drop policy if exists "groups visible to members" on public.groups;
create policy "groups visible to members" on public.groups
  for select using (
    created_by = auth.uid()
    or public.is_group_member(id)
  );

-- Backfill memberships for already created groups where the creator has no row in group_members.
insert into public.group_members (group_id, user_id, role)
select g.id, g.created_by, 'admin'
from public.groups g
left join public.group_members gm
  on gm.group_id = g.id
 and gm.user_id = g.created_by
where gm.group_id is null;
