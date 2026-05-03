with target_group as (
  select id
  from public.groups
  where name = 'MIM2026'
  order by created_at desc
  limit 1
)
insert into public.festival_days (group_id, date, label)
select tg.id, v.date_value, v.label
from target_group tg
cross join (
  values
    ('2026-04-24'::date, 'Freitag'),
    ('2026-04-25'::date, 'Samstag')
) as v(date_value, label)
where not exists (
  select 1
  from public.festival_days d
  where d.group_id = tg.id
    and d.date = v.date_value
);

with target_group as (
  select id, created_by
  from public.groups
  where name = 'MIM2026'
  order by created_at desc
  limit 1
)
insert into public.bands (group_id, name, genre, created_by)
select tg.id, v.name, null, tg.created_by
from target_group tg
cross join (
  values
    ('Distant Shadow'),
    ('Praying Angel'),
    ('Bleeding Machine'),
    ('Undercroft (Album Release)'),
    ('Messticator (Album Release)'),
    ('Extinct (Album Release)'),
    ('Phantom Spell'),
    ('Frank Blackfire'),
    ('Wytch Hazel'),
    ('Moshpit Maniax (Party Set)'),
    ('Interit the Curse'),
    ('Final Cry'),
    ('Guttural Disgorge'),
    ('Warsenal'),
    ('Tyranex'),
    ('Deimos Dawn'),
    ('The Hirsch Effekt'),
    ('Endseeker'),
    ('Traitor'),
    ('Devils Breakfast (Night Special)')
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
  where name = 'MIM2026'
  order by created_at desc
  limit 1
),
slot_values as (
  select *
  from (
    values
      ('Distant Shadow', '2026-04-24'::date, '2026-04-24 14:30:00+02'::timestamptz, '2026-04-24 15:00:00+02'::timestamptz),
      ('Praying Angel', '2026-04-24'::date, '2026-04-24 15:20:00+02'::timestamptz, '2026-04-24 15:50:00+02'::timestamptz),
      ('Bleeding Machine', '2026-04-24'::date, '2026-04-24 16:10:00+02'::timestamptz, '2026-04-24 16:50:00+02'::timestamptz),
      ('Undercroft (Album Release)', '2026-04-24'::date, '2026-04-24 17:10:00+02'::timestamptz, '2026-04-24 17:50:00+02'::timestamptz),
      ('Messticator (Album Release)', '2026-04-24'::date, '2026-04-24 18:10:00+02'::timestamptz, '2026-04-24 19:00:00+02'::timestamptz),
      ('Extinct (Album Release)', '2026-04-24'::date, '2026-04-24 19:20:00+02'::timestamptz, '2026-04-24 20:10:00+02'::timestamptz),
      ('Phantom Spell', '2026-04-24'::date, '2026-04-24 20:30:00+02'::timestamptz, '2026-04-24 21:10:00+02'::timestamptz),
      ('Frank Blackfire', '2026-04-24'::date, '2026-04-24 21:30:00+02'::timestamptz, '2026-04-24 22:40:00+02'::timestamptz),
      ('Wytch Hazel', '2026-04-24'::date, '2026-04-24 23:00:00+02'::timestamptz, '2026-04-25 00:10:00+02'::timestamptz),
      ('Moshpit Maniax (Party Set)', '2026-04-25'::date, '2026-04-25 13:20:00+02'::timestamptz, '2026-04-25 14:05:00+02'::timestamptz),
      ('Interit the Curse', '2026-04-25'::date, '2026-04-25 14:25:00+02'::timestamptz, '2026-04-25 15:00:00+02'::timestamptz),
      ('Final Cry', '2026-04-25'::date, '2026-04-25 15:20:00+02'::timestamptz, '2026-04-25 16:00:00+02'::timestamptz),
      ('Guttural Disgorge', '2026-04-25'::date, '2026-04-25 16:20:00+02'::timestamptz, '2026-04-25 17:00:00+02'::timestamptz),
      ('Warsenal', '2026-04-25'::date, '2026-04-25 17:20:00+02'::timestamptz, '2026-04-25 18:00:00+02'::timestamptz),
      ('Tyranex', '2026-04-25'::date, '2026-04-25 18:20:00+02'::timestamptz, '2026-04-25 19:05:00+02'::timestamptz),
      ('Deimos Dawn', '2026-04-25'::date, '2026-04-25 19:25:00+02'::timestamptz, '2026-04-25 20:10:00+02'::timestamptz),
      ('The Hirsch Effekt', '2026-04-25'::date, '2026-04-25 20:30:00+02'::timestamptz, '2026-04-25 21:20:00+02'::timestamptz),
      ('Endseeker', '2026-04-25'::date, '2026-04-25 21:40:00+02'::timestamptz, '2026-04-25 22:40:00+02'::timestamptz),
      ('Traitor', '2026-04-25'::date, '2026-04-25 23:00:00+02'::timestamptz, '2026-04-26 00:00:00+02'::timestamptz),
      ('Devils Breakfast (Night Special)', '2026-04-25'::date, '2026-04-26 00:20:00+02'::timestamptz, '2026-04-26 01:00:00+02'::timestamptz)
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
