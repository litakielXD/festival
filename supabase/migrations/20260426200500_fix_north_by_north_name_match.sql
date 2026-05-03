do $$
declare
  v_festival_id uuid;
  v_created_by uuid;
  v_group_id uuid;
  v_friday_day_id uuid;
  v_saturday_day_id uuid;
begin
  select id, created_by
  into v_festival_id, v_created_by
  from public.festivals
  where lower(name) like '%north%'
    and lower(name) like '%by%'
  order by created_at asc
  limit 1;

  if v_festival_id is null then
    raise notice 'Kein passendes North-by-North Festival gefunden.';
    return;
  end if;

  select group_id
  into v_group_id
  from public.festival_groups
  where festival_id = v_festival_id
  order by created_at asc
  limit 1;

  if v_group_id is null then
    insert into public.groups (name, created_by)
    values ('North by North Crew', v_created_by)
    returning id into v_group_id;

    insert into public.group_members (group_id, user_id, role)
    values (v_group_id, v_created_by, 'admin')
    on conflict (group_id, user_id) do nothing;

    insert into public.festival_groups (festival_id, group_id, assigned_by)
    values (v_festival_id, v_group_id, v_created_by)
    on conflict do nothing;
  end if;

  insert into public.festival_days (group_id, date, label)
  values (v_group_id, date '2026-06-12', 'Freitag, 12.06.')
  on conflict do nothing;

  insert into public.festival_days (group_id, date, label)
  values (v_group_id, date '2026-06-13', 'Samstag, 13.06.')
  on conflict do nothing;

  select id into v_friday_day_id
  from public.festival_days
  where group_id = v_group_id and date = date '2026-06-12'
  limit 1;

  select id into v_saturday_day_id
  from public.festival_days
  where group_id = v_group_id and date = date '2026-06-13'
  limit 1;

  insert into public.bands (group_id, name, genre, created_by, festival_day_id)
  select v_group_id, input.band_name, null, v_created_by, v_friday_day_id
  from (
    values
      ('Wasting Pigs'),
      ('Plasmajet'),
      ('Audiowolf'),
      ('Betastone')
  ) as input(band_name)
  on conflict do nothing;

  insert into public.bands (group_id, name, genre, created_by, festival_day_id)
  select v_group_id, input.band_name, null, v_created_by, v_saturday_day_id
  from (
    values
      ('Jason Kane And The Jive'),
      ('Deville'),
      ('Exa'),
      ('TrainTrain'),
      ('The Zirf'),
      ('Skepsis'),
      ('Tortous Flow'),
      ('Degreaver'),
      ('Lucky You')
  ) as input(band_name)
  on conflict do nothing;

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
