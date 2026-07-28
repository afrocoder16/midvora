-- Midvora Client Portal database schema
--
-- Run this file manually in the Supabase SQL editor. It is intentionally
-- limited to portal-owned tables and storage objects so it can coexist with
-- the proposal app in the same Supabase project.

-- =============================================================================
-- Tables
-- =============================================================================

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  slug text unique not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  website_url text,
  plan text,
  status text default 'onboarding',
  go_live_date date,
  hidden_dashboard_sections text[] not null default '{}'::text[],
  created_at timestamptz default now()
);

-- Existing portal projects created before dashboard visibility controls need
-- the column added separately because CREATE TABLE IF NOT EXISTS is a no-op.
alter table public.clients
  add column if not exists hidden_dashboard_sections text[]
  not null default '{}'::text[];

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'clients_hidden_dashboard_sections_valid'
      and conrelid = 'public.clients'::regclass
  ) then
    alter table public.clients
      add constraint clients_hidden_dashboard_sections_valid
      check (
        hidden_dashboard_sections <@ array[
          'overview', 'tasks', 'assets', 'meetings', 'metrics'
        ]::text[]
      );
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'client' check (role in ('admin', 'client')),
  client_id uuid references public.clients(id) on delete set null,
  full_name text,
  created_at timestamptz default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  status text not null default 'todo' check (status in ('todo', 'done')),
  created_at timestamptz default now()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  label text,
  type text,
  storage_path text,
  created_at timestamptz default now()
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text,
  scheduled_at timestamptz,
  meeting_url text,
  notes text,
  created_at timestamptz default now()
);

create table if not exists public.metrics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  period_month date,
  site_visits int default 0,
  calls_from_site int default 0,
  seo_rank_change int default 0,
  new_reviews int default 0,
  created_at timestamptz default now(),
  unique (client_id, period_month)
);

-- =============================================================================
-- RLS helper functions
--
-- SECURITY DEFINER lets these helpers read profiles without recursively
-- invoking the profiles policies that call them.
-- =============================================================================

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
$$;

create or replace function public.get_my_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select client_id
  from public.profiles
  where id = auth.uid()
$$;

-- =============================================================================
-- Row Level Security
--
-- Authenticated admins can read all portal records. Admin writes happen
-- server-side with the service-role key, which bypasses RLS, so separate admin
-- INSERT, UPDATE, and DELETE policies are not required.
-- =============================================================================

alter table public.clients enable row level security;
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.assets enable row level security;
alter table public.meetings enable row level security;
alter table public.metrics enable row level security;

-- Profiles

drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "admins read all profiles" on public.profiles;
create policy "admins read all profiles"
  on public.profiles for select
  to authenticated
  using (public.get_my_role() = 'admin');

-- Clients

drop policy if exists "admins read all clients" on public.clients;
create policy "admins read all clients"
  on public.clients for select
  to authenticated
  using (public.get_my_role() = 'admin');

drop policy if exists "clients read own client" on public.clients;
create policy "clients read own client"
  on public.clients for select
  to authenticated
  using (id = public.get_my_client_id());

-- Tasks

drop policy if exists "admins read all tasks" on public.tasks;
create policy "admins read all tasks"
  on public.tasks for select
  to authenticated
  using (public.get_my_role() = 'admin');

drop policy if exists "clients read own tasks" on public.tasks;
create policy "clients read own tasks"
  on public.tasks for select
  to authenticated
  using (client_id = public.get_my_client_id());

drop policy if exists "clients update own tasks" on public.tasks;
create policy "clients update own tasks"
  on public.tasks for update
  to authenticated
  using (client_id = public.get_my_client_id())
  with check (client_id = public.get_my_client_id());

-- Assets

drop policy if exists "admins read all assets" on public.assets;
create policy "admins read all assets"
  on public.assets for select
  to authenticated
  using (public.get_my_role() = 'admin');

drop policy if exists "clients read own assets" on public.assets;
create policy "clients read own assets"
  on public.assets for select
  to authenticated
  using (client_id = public.get_my_client_id());

-- Meetings

drop policy if exists "admins read all meetings" on public.meetings;
create policy "admins read all meetings"
  on public.meetings for select
  to authenticated
  using (public.get_my_role() = 'admin');

drop policy if exists "clients read own meetings" on public.meetings;
create policy "clients read own meetings"
  on public.meetings for select
  to authenticated
  using (client_id = public.get_my_client_id());

-- Metrics

drop policy if exists "admins read all metrics" on public.metrics;
create policy "admins read all metrics"
  on public.metrics for select
  to authenticated
  using (public.get_my_role() = 'admin');

drop policy if exists "clients read own metrics" on public.metrics;
create policy "clients read own metrics"
  on public.metrics for select
  to authenticated
  using (client_id = public.get_my_client_id());

-- =============================================================================
-- Private client asset storage
--
-- Object names use the format <client_id>/<filename>.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('client-assets', 'client-assets', false)
on conflict (id) do nothing;

drop policy if exists "admins manage client assets" on storage.objects;
create policy "admins manage client assets"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'client-assets'
    and public.get_my_role() = 'admin'
  )
  with check (
    bucket_id = 'client-assets'
    and public.get_my_role() = 'admin'
  );

drop policy if exists "clients read own client assets" on storage.objects;
create policy "clients read own client assets"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'client-assets'
    and (storage.foldername(name))[1] = public.get_my_client_id()::text
  );
