create table if not exists public.group_direct_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

alter table public.group_direct_messages enable row level security;

create or replace function public.is_group_peer(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members me
    join public.group_members peer on peer.group_id = me.group_id
    where me.user_id = auth.uid()
      and peer.user_id = target_user_id
  );
$$;

drop policy if exists "profiles read group peers" on public.profiles;
create policy "profiles read group peers" on public.profiles
  for select using (
    auth.uid() = user_id
    or public.is_group_peer(user_id)
  );

drop policy if exists "group dm read own" on public.group_direct_messages;
create policy "group dm read own" on public.group_direct_messages
  for select using (
    sender_id = auth.uid()
    or recipient_id = auth.uid()
  );

drop policy if exists "group dm insert own" on public.group_direct_messages;
create policy "group dm insert own" on public.group_direct_messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_group_member(group_id)
    and exists (
      select 1
      from public.group_members gm
      where gm.group_id = group_direct_messages.group_id
        and gm.user_id = group_direct_messages.recipient_id
    )
  );
