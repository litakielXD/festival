do $$
declare
  v_group_id uuid;
begin
  select fg.group_id
  into v_group_id
  from public.festival_groups fg
  join public.festivals f on f.id = fg.festival_id
  where lower(f.name) like '%north%'
    and lower(f.name) like '%by%'
  order by fg.created_at asc
  limit 1;

  if v_group_id is null then
    raise notice 'North-by-North Gruppe nicht gefunden, Sortierung uebersprungen.';
    return;
  end if;

  update public.bands
  set day_sort_index = case lower(name)
    when lower('Wasting Pigs') then 1
    when lower('Plasmajet') then 2
    when lower('Audiowolf') then 3
    when lower('Betastone') then 4
    else day_sort_index
  end
  where group_id = v_group_id
    and lower(name) in (
      lower('Wasting Pigs'),
      lower('Plasmajet'),
      lower('Audiowolf'),
      lower('Betastone')
    );

  update public.bands
  set day_sort_index = case lower(name)
    when lower('Jason Kane And The Jive') then 1
    when lower('Deville') then 2
    when lower('Exa') then 3
    when lower('TrainTrain') then 4
    when lower('The Zirf') then 5
    when lower('Skepsis') then 6
    when lower('Tortous Flow') then 7
    when lower('Degreaver') then 8
    when lower('Lucky You') then 9
    else day_sort_index
  end
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
end
$$;
