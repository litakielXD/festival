create table if not exists public.festival_members (
  festival_id uuid not null references public.festivals(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (festival_id, user_id)
);

create table if not exists public.festival_direct_messages (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

alter table public.festival_members enable row level security;
alter table public.festival_direct_messages enable row level security;

create or replace function public.is_festival_member(target_festival_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.festival_members fm
    where fm.festival_id = target_festival_id
      and fm.user_id = auth.uid()
  );
$$;

-- Festivals visibility now based on festival members / creator.
drop policy if exists "festivals read by creator or member" on public.festivals;
create policy "festivals read by creator or member" on public.festivals
  for select using (
    created_by = auth.uid()
    or public.is_festival_member(id)
  );

drop policy if exists "festival members read own festivals" on public.festival_members;
create policy "festival members read own festivals" on public.festival_members
  for select using (
    user_id = auth.uid()
    or public.is_festival_creator(festival_id)
    or public.is_festival_member(festival_id)
  );

drop policy if exists "festival members insert by creator" on public.festival_members;
create policy "festival members insert by creator" on public.festival_members
  for insert with check (
    public.is_festival_creator(festival_id)
  );

drop policy if exists "festival members delete by creator" on public.festival_members;
create policy "festival members delete by creator" on public.festival_members
  for delete using (public.is_festival_creator(festival_id));

drop policy if exists "festival dm read by members" on public.festival_direct_messages;
create policy "festival dm read by members" on public.festival_direct_messages
  for select using (
    public.is_festival_member(festival_id)
  );

drop policy if exists "festival dm insert by member" on public.festival_direct_messages;
create policy "festival dm insert by member" on public.festival_direct_messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_festival_member(festival_id)
    and exists (
      select 1
      from public.festival_members fm
      where fm.festival_id = festival_direct_messages.festival_id
        and fm.user_id = festival_direct_messages.recipient_id
    )
  );

drop policy if exists "festival dm delete own sent" on public.festival_direct_messages;
create policy "festival dm delete own sent" on public.festival_direct_messages
  for delete using (sender_id = auth.uid());

-- Backfill: existing festival-group memberships become festival_members.
insert into public.festival_members (festival_id, user_id, role, invited_by)
select distinct fg.festival_id, gm.user_id, gm.role, fg.assigned_by
from public.festival_groups fg
join public.group_members gm on gm.group_id = fg.group_id
on conflict (festival_id, user_id) do nothing;
