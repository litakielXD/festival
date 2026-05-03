-- Zielbild:
-- - Keine Gruppe "MIM2026" mehr, stattdessen Gruppe "Meltdown"
-- - Festival "MIM2026" bleibt Event
-- - Gruppe "Meltdown" ist dem Festival "MIM2026" zugewiesen
-- - Mitglieder in Meltdown: litakiel@gmail.com und melanie@festival.local (falls vorhanden)

with target_group as (
  select id, created_by
  from public.groups
  where name = 'MIM2026'
  order by created_at desc
  limit 1
),
renamed as (
  update public.groups g
  set name = 'Meltdown'
  where g.id in (select id from target_group)
  returning g.id, g.created_by
),
target_festival as (
  select id
  from public.festivals
  where name = 'MIM2026'
  order by created_at desc
  limit 1
),
ensure_festival as (
  insert into public.festivals (name, starts_on, ends_on, location, created_by)
  select
    'MIM2026',
    (
      select min(fd.date)
      from public.festival_days fd
      join renamed r on r.id = fd.group_id
    ),
    (
      select max(fd.date)
      from public.festival_days fd
      join renamed r on r.id = fd.group_id
    ),
    null,
    (select created_by from renamed limit 1)
  where not exists (select 1 from target_festival)
  returning id
),
festival_pick as (
  select id from target_festival
  union all
  select id from ensure_festival
  limit 1
)
insert into public.festival_groups (festival_id, group_id, assigned_by)
select fp.id, r.id, r.created_by
from festival_pick fp
join renamed r on true
where not exists (
  select 1
  from public.festival_groups fg
  where fg.festival_id = fp.id and fg.group_id = r.id
);

-- Mitglieder in Meltdown sicherstellen (nur wenn User existieren)
with meltdown as (
  select id
  from public.groups
  where name = 'Meltdown'
  order by created_at desc
  limit 1
),
litakiel_user as (
  select id
  from auth.users
  where email = 'litakiel@gmail.com'
  limit 1
),
melanie_user as (
  select id
  from auth.users
  where email = 'melanie@festival.local'
  limit 1
)
insert into public.group_members (group_id, user_id, role)
select m.id, u.id, 'member'
from meltdown m
join litakiel_user u on true
where not exists (
  select 1
  from public.group_members gm
  where gm.group_id = m.id and gm.user_id = u.id
);

with meltdown as (
  select id
  from public.groups
  where name = 'Meltdown'
  order by created_at desc
  limit 1
),
melanie_user as (
  select id
  from auth.users
  where email = 'melanie@festival.local'
  limit 1
)
insert into public.group_members (group_id, user_id, role)
select m.id, u.id, 'member'
from meltdown m
join melanie_user u on true
where not exists (
  select 1
  from public.group_members gm
  where gm.group_id = m.id and gm.user_id = u.id
);
