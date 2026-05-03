create table if not exists public.festivals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  starts_on date,
  ends_on date,
  location text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (starts_on is null or ends_on is null or starts_on <= ends_on)
);

create table if not exists public.festival_groups (
  festival_id uuid not null references public.festivals(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  assigned_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (festival_id, group_id)
);

alter table public.festivals enable row level security;
alter table public.festival_groups enable row level security;

create or replace function public.is_festival_creator(target_festival_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.festivals
    where id = target_festival_id
      and created_by = auth.uid()
  );
$$;

drop policy if exists "festivals read by creator or member" on public.festivals;
create policy "festivals read by creator or member" on public.festivals
  for select using (
    created_by = auth.uid()
    or exists (
      select 1
      from public.festival_groups fg
      join public.group_members gm on gm.group_id = fg.group_id
      where fg.festival_id = festivals.id and gm.user_id = auth.uid()
    )
  );

drop policy if exists "festivals insert own" on public.festivals;
create policy "festivals insert own" on public.festivals
  for insert with check (created_by = auth.uid());

drop policy if exists "festivals update creator" on public.festivals;
create policy "festivals update creator" on public.festivals
  for update using (created_by = auth.uid())
  with check (created_by = auth.uid());

drop policy if exists "festival groups read by related membership" on public.festival_groups;
create policy "festival groups read by related membership" on public.festival_groups
  for select using (
    public.is_group_member(group_id)
    or public.is_festival_creator(festival_id)
  );

drop policy if exists "festival groups insert by group admin or festival creator" on public.festival_groups;
create policy "festival groups insert by group admin or festival creator" on public.festival_groups
  for insert with check (
    assigned_by = auth.uid()
    and (
      public.is_group_admin(group_id)
      or public.is_festival_creator(festival_id)
    )
  );

drop policy if exists "festival groups delete by group admin or festival creator" on public.festival_groups;
create policy "festival groups delete by group admin or festival creator" on public.festival_groups
  for delete using (
    public.is_group_admin(group_id)
    or public.is_festival_creator(festival_id)
  );
