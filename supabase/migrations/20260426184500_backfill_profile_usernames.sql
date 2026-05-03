insert into public.profiles (user_id, display_name)
select
  u.id,
  coalesce(
    nullif(u.raw_user_meta_data ->> 'username', ''),
    nullif(u.raw_user_meta_data ->> 'display_name', ''),
    nullif(split_part(split_part(u.email, '@', 1), '.', 1), ''),
    nullif(split_part(u.email, '@', 1), ''),
    left(u.id::text, 8)
  ) as display_name
from auth.users u
on conflict (user_id) do update
set display_name = coalesce(
  nullif(public.profiles.display_name, ''),
  excluded.display_name
);
