-- Migration: Create plant_scans and farming_plans tables
-- Enables cross-device and cross-browser history synchronization for user accounts.

-- 1. Create plant_scans table
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

-- Index for fast user history lookups
create index if not exists idx_plant_scans_user_email on public.plant_scans (user_email);
create index if not exists idx_plant_scans_created_at on public.plant_scans (created_at desc);

-- 2. Create farming_plans table
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

-- Index for fast user farming plan lookups
create index if not exists idx_farming_plans_user_email on public.farming_plans (user_email);
create index if not exists idx_farming_plans_created_at on public.farming_plans (created_at desc);

-- 3. Row Level Security (RLS)
alter table public.plant_scans enable row level security;
alter table public.farming_plans enable row level security;

-- Policies for plant_scans
grant all on public.plant_scans to authenticated;
grant all on public.plant_scans to service_role;

drop policy if exists "Users can read own scans" on public.plant_scans;
create policy "Users can read own scans" on public.plant_scans
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

-- Policies for farming_plans
grant all on public.farming_plans to authenticated;
grant all on public.farming_plans to service_role;

drop policy if exists "Users can read own farming plans" on public.farming_plans;
create policy "Users can read own farming plans" on public.farming_plans
  for select to authenticated
  using (user_email = lower(auth.jwt() ->> 'email'));

drop policy if exists "Users can insert own farming plans" on public.farming_plans;
create policy "Users can insert own farming plans" on public.farming_plans
  for insert to authenticated
  with check (user_email = lower(auth.jwt() ->> 'email'));

drop policy if exists "Users can update own farming plans" on public.farming_plans;
create policy "Users can update own farming plans" on public.farming_plans
  for update to authenticated
  using (user_email = lower(auth.jwt() ->> 'email'));

drop policy if exists "Users can delete own farming plans" on public.farming_plans;
create policy "Users can delete own farming plans" on public.farming_plans
  for delete to authenticated
  using (user_email = lower(auth.jwt() ->> 'email'));

-- 4. Enable Supabase Realtime for instant synchronization across devices
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
