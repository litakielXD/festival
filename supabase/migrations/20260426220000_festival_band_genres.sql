-- Collaborative festival genres per band (max 3 distinct strings, including legacy bands.genre).

create table if not exists public.festival_band_genres (
  id uuid primary key default gen_random_uuid(),
  festival_id uuid not null references public.festivals(id) on delete cascade,
  band_id uuid not null references public.bands(id) on delete cascade,
  genre text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (length(trim(genre)) > 0)
);

create index if not exists festival_band_genres_festival_band_idx
  on public.festival_band_genres (festival_id, band_id);

alter table public.festival_band_genres enable row level security;

create or replace function public.festival_band_genres_enforce_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  legacy text;
  new_norm text;
  dup_in_rows boolean;
begin
  new_norm := lower(trim(both from NEW.genre));

  select lower(trim(both from b.genre))
  into legacy
  from public.bands b
  where b.id = NEW.band_id;

  select exists (
    select 1
    from public.festival_band_genres fbg
    where fbg.festival_id = NEW.festival_id
      and fbg.band_id = NEW.band_id
      and lower(trim(both from fbg.genre)) = new_norm
  )
  into dup_in_rows;

  if dup_in_rows then
    raise exception 'DUPLICATE_GENRE';
  end if;

  if legacy is not null and length(trim(legacy)) > 0 and legacy = new_norm then
    raise exception 'DUPLICATE_GENRE';
  end if;

  if (
    with existing as (
      select lower(trim(both from fbg.genre)) as g
      from public.festival_band_genres fbg
      where fbg.festival_id = NEW.festival_id
        and fbg.band_id = NEW.band_id
    ),
    combined as (
      select g from existing
      union
      select new_norm
      union
      select legacy
      where legacy is not null and length(trim(legacy)) > 0
    )
    select count(distinct g)::int from combined
  ) > 3 then
    raise exception 'MAX_GENRES';
  end if;

  return NEW;
end;
$$;

drop trigger if exists festival_band_genres_bi on public.festival_band_genres;
create trigger festival_band_genres_bi
  before insert on public.festival_band_genres
  for each row
  execute procedure public.festival_band_genres_enforce_limit();

drop policy if exists "festival band genres read by festival access" on public.festival_band_genres;
create policy "festival band genres read by festival access"
  on public.festival_band_genres
  for select using (
    public.is_festival_member(festival_id)
    or public.is_festival_creator(festival_id)
  );

drop policy if exists "festival band genres insert by festival member" on public.festival_band_genres;
create policy "festival band genres insert by festival member"
  on public.festival_band_genres
  for insert with check (
    created_by = auth.uid()
    and (
      public.is_festival_member(festival_id)
      or public.is_festival_creator(festival_id)
    )
    and exists (
      select 1
      from public.bands b
      join public.festival_groups fg on fg.group_id = b.group_id
      where b.id = band_id
        and fg.festival_id = festival_id
    )
  );
