alter table public.bands
add column if not exists festival_day_id uuid references public.festival_days(id) on delete set null;

update public.bands b
set festival_day_id = source.festival_day_id
from (
  select distinct on (bs.band_id)
    bs.band_id,
    bs.festival_day_id
  from public.band_slots bs
  order by bs.band_id, bs.starts_at asc
) as source
where b.id = source.band_id
  and b.festival_day_id is null;

do $$
declare
  v_festival_id uuid;
  v_group_id uuid;
  v_friday_day_id uuid;
  v_saturday_day_id uuid;
begin
  select id into v_festival_id
  from public.festivals
  where lower(name) = lower('North by North')
  limit 1;

  if v_festival_id is null then
    return;
  end if;

  select group_id into v_group_id
  from public.festival_groups
  where festival_id = v_festival_id
  order by created_at asc
  limit 1;

  if v_group_id is null then
    return;
  end if;

  select id into v_friday_day_id
  from public.festival_days
  where group_id = v_group_id and date = date '2026-06-12'
  limit 1;

  select id into v_saturday_day_id
  from public.festival_days
  where group_id = v_group_id and date = date '2026-06-13'
  limit 1;

  if v_friday_day_id is not null then
    update public.bands
    set festival_day_id = v_friday_day_id
    where group_id = v_group_id
      and lower(name) in (lower('Wasting Pigs'), lower('Plasmajet'), lower('Audiowolf'), lower('Betastone'));
  end if;

  if v_saturday_day_id is not null then
    update public.bands
    set festival_day_id = v_saturday_day_id
    where group_id = v_group_id
      and lower(name) in (
        lower('Jason Kane And The Jive'),
        lower('Deville'),
        lower('Exa'),
        lower('TrainTrain'),
        lower('The Zirf'),
        lower('Skepsis'),
        lower('Tortous Flow'),
        lower('Degreaver'),
        lower('Lucky You')
      );
  end if;
end
$$;
