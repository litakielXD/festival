create or replace function public.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = target_group_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_admin(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members
    where group_id = target_group_id
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

drop policy if exists "group members read own groups" on public.group_members;
create policy "group members read own groups" on public.group_members
  for select using (
    auth.uid() = user_id
    or public.is_group_member(group_id)
  );

drop policy if exists "group members insert self" on public.group_members;
create policy "group members insert self" on public.group_members
  for insert with check (
    auth.uid() = user_id
    or public.is_group_admin(group_id)
  );

drop policy if exists "festival day read by members" on public.festival_days;
create policy "festival day read by members" on public.festival_days
  for select using (public.is_group_member(festival_days.group_id));

drop policy if exists "festival day admin write" on public.festival_days;
create policy "festival day admin write" on public.festival_days
  for all using (public.is_group_admin(festival_days.group_id))
  with check (public.is_group_admin(festival_days.group_id));

drop policy if exists "bands read by members" on public.bands;
create policy "bands read by members" on public.bands
  for select using (public.is_group_member(bands.group_id));

drop policy if exists "bands admin write" on public.bands;
create policy "bands admin write" on public.bands
  for all using (public.is_group_admin(bands.group_id))
  with check (public.is_group_admin(bands.group_id));
