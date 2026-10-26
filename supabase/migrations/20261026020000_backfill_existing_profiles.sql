insert into public.profiles (id, display_name)
select
  auth_user.id,
  coalesce(auth_user.raw_user_meta_data ->> 'display_name', '')
from auth.users auth_user
on conflict (id) do nothing;
