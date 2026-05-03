alter table public.profiles add column if not exists avatar_url text;

create table if not exists public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists group_invites_pending_unique_idx
  on public.group_invites (group_id, lower(invited_email))
  where status = 'pending';

alter table public.group_invites enable row level security;

drop policy if exists "group invites read for admin or recipient" on public.group_invites;
create policy "group invites read for admin or recipient" on public.group_invites
  for select using (
    public.is_group_admin(group_id)
    or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

drop policy if exists "group invites insert by admin" on public.group_invites;
create policy "group invites insert by admin" on public.group_invites
  for insert with check (
    invited_by = auth.uid()
    and public.is_group_admin(group_id)
  );

drop policy if exists "group invites update by admin or recipient" on public.group_invites;
create policy "group invites update by admin or recipient" on public.group_invites
  for update using (
    public.is_group_admin(group_id)
    or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  with check (
    public.is_group_admin(group_id)
    or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
