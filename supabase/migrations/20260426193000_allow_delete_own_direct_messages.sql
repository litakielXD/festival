drop policy if exists "group dm delete own sent" on public.group_direct_messages;
create policy "group dm delete own sent" on public.group_direct_messages
  for delete using (sender_id = auth.uid());
