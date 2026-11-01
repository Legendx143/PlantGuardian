-- PlantGuardian authentication and realtime user data.
-- Passwords are owned and securely hashed by Supabase Auth (auth.users).
-- The app-facing profile table uses email as its requested primary key.
create table if not exists public.user_profiles (
  email text primary key check (email = lower(email)),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;

grant usage on schema public to authenticated;
grant select on public.user_profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.user_profiles;
create policy "Users can read their own profile"
on public.user_profiles
for select
to authenticated
using ((select auth.uid()) = auth_user_id);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (email, auth_user_id)
  values (lower(new.email), new.id)
  on conflict (email) do update set auth_user_id = excluded.auth_user_id;
  return new;
end;
$$;

revoke all on function public.handle_new_user_profile() from public;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();

do $$
begin
  alter publication supabase_realtime add table public.user_profiles;
exception
  when duplicate_object then null;
end;
$$;

-- Private storage for plant photos. Each authenticated user can only access
-- objects under a folder named with their own auth UUID.
insert into storage.buckets (id, name, public)
values ('plant-images', 'plant-images', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can view their own plant images" on storage.objects;
create policy "Users can view their own plant images"
on storage.objects for select to authenticated
using (
  bucket_id = 'plant-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can upload their own plant images" on storage.objects;
create policy "Users can upload their own plant images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'plant-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can update their own plant images" on storage.objects;
create policy "Users can update their own plant images"
on storage.objects for update to authenticated
using (
  bucket_id = 'plant-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'plant-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

drop policy if exists "Users can delete their own plant images" on storage.objects;
create policy "Users can delete their own plant images"
on storage.objects for delete to authenticated
using (
  bucket_id = 'plant-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
