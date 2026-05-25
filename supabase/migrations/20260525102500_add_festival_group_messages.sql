-- Create festival group messages table
create table if not exists public.festival_group_messages (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.festival_group_messages enable row level security;

-- SELECT policy: members can read group chat
drop policy if exists "festival group message read by members" on public.festival_group_messages;
create policy "festival group message read by members" on public.festival_group_messages
  for select using (
    public.is_festival_member(festival_id)
    or public.is_festival_creator(festival_id)
  );

-- INSERT policy: members can post messages
drop policy if exists "festival group message insert by member" on public.festival_group_messages;
create policy "festival group message insert by member" on public.festival_group_messages
  for insert with check (
    sender_id = auth.uid()
    and (
      public.is_festival_member(festival_id)
      or public.is_festival_creator(festival_id)
    )
  );

-- DELETE policy: sender or admin can delete
drop policy if exists "festival group message delete by sender or admin" on public.festival_group_messages;
create policy "festival group message delete by sender or admin" on public.festival_group_messages
  for delete using (
    sender_id = auth.uid()
    or public.is_festival_admin(festival_id)
  );
