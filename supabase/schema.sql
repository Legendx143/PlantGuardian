-- ═══════════════════════════════════════════════════════════════════════════
-- PlantGuardian — Master Real-Time PostgreSQL Database Schema
-- ═══════════════════════════════════════════════════════════════════════════
-- Copy and run this entire SQL script once in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/cdlwdyplznpnizwjcxvl/sql
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. USER PROFILES TABLE (Mirrors auth.users with email as primary key)
create table if not exists public.user_profiles (
  email text primary key check (email = lower(email)),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
grant usage on schema public to authenticated, service_role;
grant all on public.user_profiles to authenticated, service_role;

drop policy if exists "Users can read own profile" on public.user_profiles;
create policy "Users can read own profile"
  on public.user_profiles for select
  to authenticated
  using ((select auth.uid()) = auth_user_id);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
  on public.user_profiles for update
  to authenticated
  using ((select auth.uid()) = auth_user_id);

-- Auto-insert into user_profiles on new auth.users signup
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

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_user_profile();


-- 2. PLANT SCANS TABLE (Disease Diagnoses History across devices)
create table if not exists public.plant_scans (
  id bigint primary key,
  user_email text not null check (user_email = lower(user_email)),
  plant_name text not null,
  disease_name text,
  confidence text,
  status text default 'Diagnosed',
  recommendations text,
  diagnosis jsonb,
  causes text,
  nutrient_deficiency text,
  proper_nutrient_way text,
  created_at timestamptz not null default now()
);

create index if not exists idx_plant_scans_user_email on public.plant_scans (user_email);
create index if not exists idx_plant_scans_created_at on public.plant_scans (created_at desc);

alter table public.plant_scans enable row level security;
grant all on public.plant_scans to authenticated, service_role;

drop policy if exists "Users can select own scans" on public.plant_scans;
create policy "Users can select own scans" on public.plant_scans
  for select to authenticated
  using (user_email = lower(auth.jwt() ->> 'email'));

drop policy if exists "Users can insert own scans" on public.plant_scans;
create policy "Users can insert own scans" on public.plant_scans
  for insert to authenticated
  with check (user_email = lower(auth.jwt() ->> 'email'));

drop policy if exists "Users can update own scans" on public.plant_scans;
create policy "Users can update own scans" on public.plant_scans
  for update to authenticated
  using (user_email = lower(auth.jwt() ->> 'email'));

drop policy if exists "Users can delete own scans" on public.plant_scans;
create policy "Users can delete own scans" on public.plant_scans
  for delete to authenticated
  using (user_email = lower(auth.jwt() ->> 'email'));


-- 3. FARMING PLANS TABLE (Cultivation Guides History across devices)
create table if not exists public.farming_plans (
  id bigint primary key,
  user_email text not null check (user_email = lower(user_email)),
  plant_name text not null,
  soil_type text,
  location text,
  season text,
  guide text not null,
  status text default 'Completed',
  created_at timestamptz not null default now()
);

create index if not exists idx_farming_plans_user_email on public.farming_plans (user_email);
create index if not exists idx_farming_plans_created_at on public.farming_plans (created_at desc);

alter table public.farming_plans enable row level security;
grant all on public.farming_plans to authenticated, service_role;

drop policy if exists "Users can select own plans" on public.farming_plans;
create policy "Users can select own plans" on public.farming_plans
  for select to authenticated
  using (user_email = lower(auth.jwt() ->> 'email'));

drop policy if exists "Users can insert own plans" on public.farming_plans;
create policy "Users can insert own plans" on public.farming_plans
  for insert to authenticated
  with check (user_email = lower(auth.jwt() ->> 'email'));

drop policy if exists "Users can update own plans" on public.farming_plans;
create policy "Users can update own plans" on public.farming_plans
  for update to authenticated
  using (user_email = lower(auth.jwt() ->> 'email'));

drop policy if exists "Users can delete own plans" on public.farming_plans;
create policy "Users can delete own plans" on public.farming_plans
  for delete to authenticated
  using (user_email = lower(auth.jwt() ->> 'email'));


-- 4. REAL-TIME SUBSCRIPTIONS (Instant cross-device push updates)
do $$
begin
  alter publication supabase_realtime add table public.user_profiles;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.plant_scans;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.farming_plans;
exception
  when duplicate_object then null;
end;
$$;


-- 5. STORAGE BUCKET FOR PLANT PHOTOS
insert into storage.buckets (id, name, public)
values ('plant-images', 'plant-images', false)
on conflict (id) do update set public = false;

drop policy if exists "Users can view own plant images" on storage.objects;
create policy "Users can view own plant images" on storage.objects
  for select to authenticated
  using (bucket_id = 'plant-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can upload own plant images" on storage.objects;
create policy "Users can upload own plant images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'plant-images' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "Users can delete own plant images" on storage.objects;
create policy "Users can delete own plant images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'plant-images' and (storage.foldername(name))[1] = (select auth.uid()::text));
