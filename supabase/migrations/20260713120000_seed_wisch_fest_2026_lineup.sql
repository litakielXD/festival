with target_group as (
  select id, created_by
  from public.groups
  where name = 'Wisch Fest 2026'
  order by created_at desc
  limit 1
)
insert into public.bands (group_id, name, genre, created_by)
select tg.id, v.name, null, tg.created_by
from target_group tg
cross join (
  values
    ('A Very Metal Wedding')
) as v(name)
where not exists (
  select 1
  from public.bands b
  where b.group_id = tg.id
    and b.name = v.name
);

with target_group as (
  select id
  from public.groups
  where name = 'Wisch Fest 2026'
  order by created_at desc
  limit 1
),
slot_values as (
  select *
  from (
    values
      ('A Very Metal Wedding', '2026-07-17'::date, '2026-07-17 12:30:00+02'::timestamptz, '2026-07-17 13:30:00+02'::timestamptz),
      ('Dehumaniser', '2026-07-17'::date, '2026-07-17 15:00:00+02'::timestamptz, '2026-07-17 16:00:00+02'::timestamptz),
      ('MANTA', '2026-07-17'::date, '2026-07-17 16:30:00+02'::timestamptz, '2026-07-17 17:30:00+02'::timestamptz),
      ('Thrashing Pumpguns', '2026-07-17'::date, '2026-07-17 17:45:00+02'::timestamptz, '2026-07-17 18:45:00+02'::timestamptz),
      ('Lunatic', '2026-07-17'::date, '2026-07-17 19:15:00+02'::timestamptz, '2026-07-17 20:15:00+02'::timestamptz),
      ('Styropor', '2026-07-17'::date, '2026-07-17 20:30:00+02'::timestamptz, '2026-07-17 21:30:00+02'::timestamptz),
      ('Witch Cross', '2026-07-17'::date, '2026-07-17 22:15:00+02'::timestamptz, '2026-07-17 23:15:00+02'::timestamptz),
      ('Die Frivolen Frauenhelden', '2026-07-18'::date, '2026-07-18 13:15:00+02'::timestamptz, '2026-07-18 14:15:00+02'::timestamptz),
      ('Furio Grace', '2026-07-18'::date, '2026-07-18 14:30:00+02'::timestamptz, '2026-07-18 15:30:00+02'::timestamptz),
      ('Monstrum', '2026-07-18'::date, '2026-07-18 16:00:00+02'::timestamptz, '2026-07-18 17:00:00+02'::timestamptz),
      ('Employer', '2026-07-18'::date, '2026-07-18 17:15:00+02'::timestamptz, '2026-07-18 18:15:00+02'::timestamptz),
      ('Blitz', '2026-07-18'::date, '2026-07-18 18:45:00+02'::timestamptz, '2026-07-18 19:45:00+02'::timestamptz),
      ('Scarblade', '2026-07-18'::date, '2026-07-18 20:00:00+02'::timestamptz, '2026-07-18 21:00:00+02'::timestamptz),
      ('Instructor', '2026-07-18'::date, '2026-07-18 21:15:00+02'::timestamptz, '2026-07-18 22:15:00+02'::timestamptz),
      ('Mechanic Tyrants', '2026-07-18'::date, '2026-07-18 22:30:00+02'::timestamptz, '2026-07-18 23:30:00+02'::timestamptz)
  ) as t(band_name, day_date, starts_at, ends_at)
)
insert into public.band_slots (band_id, festival_day_id, stage, starts_at, ends_at)
select b.id, d.id, null, sv.starts_at, sv.ends_at
from target_group tg
join slot_values sv on true
join public.bands b
  on b.group_id = tg.id
 and b.name = sv.band_name
join public.festival_days d
  on d.group_id = tg.id
 and d.date = sv.day_date
where not exists (
  select 1
  from public.band_slots bs
  where bs.band_id = b.id
    and bs.festival_day_id = d.id
    and bs.starts_at = sv.starts_at
    and bs.ends_at = sv.ends_at
);
