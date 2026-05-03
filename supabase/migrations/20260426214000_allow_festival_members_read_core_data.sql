-- Festival members must be able to read timeline/bands data even without
-- being explicit members of the underlying legacy group.

create or replace function public.is_festival_member_for_group(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.festival_groups fg
    join public.festival_members fm on fm.festival_id = fg.festival_id
    where fg.group_id = target_group_id
      and fm.user_id = auth.uid()
  );
$$;

drop policy if exists "festival day read by members" on public.festival_days;
create policy "festival day read by members" on public.festival_days
  for select using (
    public.is_group_member(festival_days.group_id)
    or public.is_festival_member_for_group(festival_days.group_id)
  );

drop policy if exists "bands read by members" on public.bands;
create policy "bands read by members" on public.bands
  for select using (
    public.is_group_member(bands.group_id)
    or public.is_festival_member_for_group(bands.group_id)
  );

drop policy if exists "band slots read by members" on public.band_slots;
create policy "band slots read by members" on public.band_slots
  for select using (
    exists (
      select 1
      from public.bands b
      where b.id = band_slots.band_id
        and (
          public.is_group_member(b.group_id)
          or public.is_festival_member_for_group(b.group_id)
        )
    )
  );

drop policy if exists "notes read by visibility and membership" on public.notes;
create policy "notes read by visibility and membership" on public.notes
  for select using (
    (
      visibility = 'private' and author_id = auth.uid()
    )
    or (
      visibility = 'group'
      and exists (
        select 1
        from public.bands b
        where b.id = notes.band_id
          and (
            public.is_group_member(b.group_id)
            or public.is_festival_member_for_group(b.group_id)
          )
      )
    )
  );

drop policy if exists "notes insert by member" on public.notes;
create policy "notes insert by member" on public.notes
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1
      from public.bands b
      where b.id = notes.band_id
        and (
          public.is_group_member(b.group_id)
          or public.is_festival_member_for_group(b.group_id)
        )
    )
  );
