-- Per-client dashboard section visibility.
-- Run once in the shared midvora-db Supabase SQL editor.
-- This changes only the portal-owned public.clients table.

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
