with target_group as (
  select id, name, created_by
  from public.groups
  where name = 'MIM2026'
  order by created_at desc
  limit 1
),
day_range as (
  select
    min(fd.date) as starts_on,
    max(fd.date) as ends_on
  from public.festival_days fd
  join target_group tg on tg.id = fd.group_id
),
upsert_festival as (
  insert into public.festivals (name, starts_on, ends_on, location, created_by)
  select
    tg.name,
    dr.starts_on,
    dr.ends_on,
    null,
    tg.created_by
  from target_group tg
  left join day_range dr on true
  where not exists (
    select 1
    from public.festivals f
    where f.name = tg.name
  )
  returning id, name
),
festival_pick as (
  select id
  from upsert_festival
  union all
  select f.id
  from public.festivals f
  join target_group tg on tg.name = f.name
  order by id
  limit 1
)
insert into public.festival_groups (festival_id, group_id, assigned_by)
select fp.id, tg.id, tg.created_by
from festival_pick fp
join target_group tg on true
where not exists (
  select 1
  from public.festival_groups fg
  where fg.festival_id = fp.id and fg.group_id = tg.id
);
