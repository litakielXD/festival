-- Festival members must be able to resolve linked groups for their festival.
-- Otherwise timeline/notes queries using festival_groups return empty results.

drop policy if exists "festival groups read by related membership" on public.festival_groups;
create policy "festival groups read by related membership" on public.festival_groups
  for select using (
    public.is_group_member(group_id)
    or public.is_festival_creator(festival_id)
    or public.is_festival_member(festival_id)
  );
