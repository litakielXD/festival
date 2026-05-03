create table if not exists public.festival_band_rankings (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  band_id uuid not null references public.bands (id) on delete cascade,
  rank_position integer not null check (rank_position > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (festival_id, user_id, band_id)
);

alter table public.festival_band_rankings enable row level security;

drop policy if exists "festival rankings read members" on public.festival_band_rankings;
create policy "festival rankings read members"
  on public.festival_band_rankings
  for select
  to authenticated
  using (public.is_festival_member(festival_id));

drop policy if exists "festival rankings insert own" on public.festival_band_rankings;
create policy "festival rankings insert own"
  on public.festival_band_rankings
  for insert
  to authenticated
  with check (auth.uid() = user_id and public.is_festival_member(festival_id));

drop policy if exists "festival rankings update own" on public.festival_band_rankings;
create policy "festival rankings update own"
  on public.festival_band_rankings
  for update
  to authenticated
  using (auth.uid() = user_id and public.is_festival_member(festival_id))
  with check (auth.uid() = user_id and public.is_festival_member(festival_id));

drop policy if exists "festival rankings delete own" on public.festival_band_rankings;
create policy "festival rankings delete own"
  on public.festival_band_rankings
  for delete
  to authenticated
  using (auth.uid() = user_id and public.is_festival_member(festival_id));
