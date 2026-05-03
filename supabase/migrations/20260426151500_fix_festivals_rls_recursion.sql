create or replace function public.is_festival_creator(target_festival_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.festivals
    where id = target_festival_id
      and created_by = auth.uid()
  );
$$;

drop policy if exists "festival groups read by related membership" on public.festival_groups;
create policy "festival groups read by related membership" on public.festival_groups
  for select using (
    public.is_group_member(group_id)
    or public.is_festival_creator(festival_id)
  );

drop policy if exists "festival groups insert by group admin or festival creator" on public.festival_groups;
create policy "festival groups insert by group admin or festival creator" on public.festival_groups
  for insert with check (
    assigned_by = auth.uid()
    and (
      public.is_group_admin(group_id)
      or public.is_festival_creator(festival_id)
    )
  );

drop policy if exists "festival groups delete by group admin or festival creator" on public.festival_groups;
create policy "festival groups delete by group admin or festival creator" on public.festival_groups
  for delete using (
    public.is_group_admin(group_id)
    or public.is_festival_creator(festival_id)
  );
