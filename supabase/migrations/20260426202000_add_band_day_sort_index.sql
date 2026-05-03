alter table public.bands
add column if not exists day_sort_index integer;

with ranked as (
  select
    id,
    row_number() over (
      partition by festival_day_id
      order by created_at asc, name asc
    ) as rn
  from public.bands
  where festival_day_id is not null
)
update public.bands b
set day_sort_index = ranked.rn
from ranked
where b.id = ranked.id
  and b.day_sort_index is null;
