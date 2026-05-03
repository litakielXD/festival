-- Allow authors and festival creators to remove collaborative genre rows (matches server action).

drop policy if exists "festival band genres delete own or by creator" on public.festival_band_genres;
create policy "festival band genres delete own or by creator"
  on public.festival_band_genres
  for delete
  using (
    created_by = auth.uid()
    or public.is_festival_creator(festival_id)
  );
