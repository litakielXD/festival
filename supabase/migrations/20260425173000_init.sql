create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','member')),
  created_at timestamptz not null default now(),
  primary key(group_id, user_id)
);

create table if not exists public.festival_days (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  date date not null,
  label text not null
);

create table if not exists public.bands (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  genre text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.band_slots (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references public.bands(id) on delete cascade,
  festival_day_id uuid not null references public.festival_days(id) on delete cascade,
  stage text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  check (starts_at < ends_at)
);

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  band_id uuid not null references public.bands(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  visibility text not null check (visibility in ('private','group')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.festival_days enable row level security;
alter table public.bands enable row level security;
alter table public.band_slots enable row level security;
alter table public.notes enable row level security;

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

drop policy if exists "profiles self access" on public.profiles;
create policy "profiles self access" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "groups visible to members" on public.groups;
create policy "groups visible to members" on public.groups
  for select using (
    created_by = auth.uid()
    or
    exists (
      select 1 from public.group_members gm
      where gm.group_id = id and gm.user_id = auth.uid()
    )
  );

drop policy if exists "groups insert own" on public.groups;
create policy "groups insert own" on public.groups
  for insert with check (created_by = auth.uid());

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
  for select using (
    public.is_group_member(festival_days.group_id)
  );

drop policy if exists "festival day admin write" on public.festival_days;
create policy "festival day admin write" on public.festival_days
  for all using (public.is_group_admin(festival_days.group_id))
  with check (
    public.is_group_admin(festival_days.group_id)
  );

drop policy if exists "bands read by members" on public.bands;
create policy "bands read by members" on public.bands
  for select using (
    public.is_group_member(bands.group_id)
  );

drop policy if exists "bands admin write" on public.bands;
create policy "bands admin write" on public.bands
  for all using (public.is_group_admin(bands.group_id))
  with check (
    public.is_group_admin(bands.group_id)
  );

drop policy if exists "band slots read by members" on public.band_slots;
create policy "band slots read by members" on public.band_slots
  for select using (
    exists (
      select 1
      from public.bands b
      join public.group_members gm on gm.group_id = b.group_id
      where b.id = band_slots.band_id and gm.user_id = auth.uid()
    )
  );

drop policy if exists "band slots admin write" on public.band_slots;
create policy "band slots admin write" on public.band_slots
  for all using (
    exists (
      select 1
      from public.bands b
      join public.group_members gm on gm.group_id = b.group_id
      where b.id = band_slots.band_id and gm.user_id = auth.uid() and gm.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.bands b
      join public.group_members gm on gm.group_id = b.group_id
      where b.id = band_slots.band_id and gm.user_id = auth.uid() and gm.role = 'admin'
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
        join public.group_members gm on gm.group_id = b.group_id
        where b.id = notes.band_id and gm.user_id = auth.uid()
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
      join public.group_members gm on gm.group_id = b.group_id
      where b.id = notes.band_id and gm.user_id = auth.uid()
    )
  );

drop policy if exists "notes update delete author only" on public.notes;
create policy "notes update delete author only" on public.notes
  for all using (author_id = auth.uid()) with check (author_id = auth.uid());
