-- Helper function to check if a user is an admin of a festival
create or replace function public.is_festival_admin(target_festival_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.festivals f
    left join public.festival_members fm on fm.festival_id = f.id and fm.user_id = auth.uid()
    where f.id = target_festival_id
      and (f.created_by = auth.uid() or fm.role = 'admin')
  );
$$;

-- Helper function to check if a user is an admin of a festival linked to a group
create or replace function public.is_festival_admin_for_group(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.festival_groups fg
    join public.festivals f on f.id = fg.festival_id
    left join public.festival_members fm on fm.festival_id = f.id and fm.user_id = auth.uid()
    where fg.group_id = target_group_id
      and (f.created_by = auth.uid() or fm.role = 'admin')
  );
$$;

-- Expand the band slots admin write policy so festival-level admins can also schedule/unschedule bands
drop policy if exists "band slots admin write" on public.band_slots;
create policy "band slots admin write" on public.band_slots
  for all using (
    exists (
      select 1
      from public.bands b
      where b.id = band_slots.band_id
        and (
          public.is_group_admin(b.group_id)
          or public.is_festival_admin_for_group(b.group_id)
        )
    )
  )
  with check (
    exists (
      select 1
      from public.bands b
      where b.id = band_slots.band_id
        and (
          public.is_group_admin(b.group_id)
          or public.is_festival_admin_for_group(b.group_id)
        )
    )
  );

-- Create the band slot proposals table
create table if not exists public.band_slot_proposals (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  band_id uuid not null references public.bands(id) on delete cascade,
  festival_day_id uuid not null references public.festival_days(id) on delete cascade,
  suggested_by uuid not null references auth.users(id) on delete cascade default auth.uid(),
  stage text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz not null default now(),
  check (starts_at < ends_at),
  unique (festival_id, band_id, suggested_by)
);

-- Enable Row-Level Security
alter table public.band_slot_proposals enable row level security;

-- Define Policies for band_slot_proposals
drop policy if exists "band slot proposals read by members" on public.band_slot_proposals;
create policy "band slot proposals read by members" on public.band_slot_proposals
  for select using (
    public.is_festival_member(festival_id)
    or public.is_festival_creator(festival_id)
  );

drop policy if exists "band slot proposals insert by member" on public.band_slot_proposals;
create policy "band slot proposals insert by member" on public.band_slot_proposals
  for insert with check (
    suggested_by = auth.uid()
    and (
      public.is_festival_member(festival_id)
      or public.is_festival_creator(festival_id)
    )
  );

drop policy if exists "band slot proposals update by proposer" on public.band_slot_proposals;
create policy "band slot proposals update by proposer" on public.band_slot_proposals
  for update using (
    suggested_by = auth.uid()
  )
  with check (
    suggested_by = auth.uid()
  );

drop policy if exists "band slot proposals delete by proposer or admin" on public.band_slot_proposals;
create policy "band slot proposals delete by proposer or admin" on public.band_slot_proposals
  for delete using (
    suggested_by = auth.uid()
    or public.is_festival_admin(festival_id)
  );
