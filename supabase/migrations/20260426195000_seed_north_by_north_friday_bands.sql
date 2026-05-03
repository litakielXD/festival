do $$
declare
  v_festival_id uuid;
  v_group_id uuid;
  v_created_by uuid;
  v_day_id uuid;
begin
  select id, created_by
  into v_festival_id, v_created_by
  from public.festivals
  where lower(name) = lower('North by North')
  limit 1;

  if v_festival_id is null then
    raise notice 'Festival "North by North" nicht gefunden, Migration uebersprungen.';
    return;
  end if;

  select group_id
  into v_group_id
  from public.festival_groups
  where festival_id = v_festival_id
  order by created_at asc
  limit 1;

  if v_group_id is null then
    raise notice 'Keine Gruppe fuer Festival "North by North" zugewiesen, Migration uebersprungen.';
    return;
  end if;

  select id
  into v_day_id
  from public.festival_days
  where group_id = v_group_id
    and date = date '2026-06-12'
  limit 1;

  if v_day_id is null then
    insert into public.festival_days (group_id, date, label)
    values (v_group_id, date '2026-06-12', 'Freitag, 12.06.')
    returning id into v_day_id;
  end if;

  insert into public.bands (group_id, name, genre, created_by)
  select v_group_id, band_name, null, v_created_by
  from (
    values
      ('Wasting Pigs'),
      ('Plasmajet'),
      ('Audiowolf'),
      ('Betastone')
  ) as input(band_name)
  where not exists (
    select 1
    from public.bands existing
    where existing.group_id = v_group_id
      and lower(existing.name) = lower(input.band_name)
  );
end
$$;
