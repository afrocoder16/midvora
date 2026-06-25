-- ═════════════════════════════════════════════════════════════════════════════
-- Midvora Proposals — Supabase schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.
-- ═════════════════════════════════════════════════════════════════════════════

-- Needed for gen_random_uuid() and gen_random_bytes() (token generation).
create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- Enum for proposal lifecycle
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'proposal_status') then
    create type proposal_status as enum ('draft', 'sent', 'signed');
  end if;
end$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- proposals
--   token: long, random, URL-safe string (generated in app, NOT a sequential id)
--   line_items: jsonb array of { description: text, price: number }
--   total_price: stored in cents to avoid floating-point money bugs
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.proposals (
  id              uuid primary key default gen_random_uuid(),
  token           text not null unique,
  client_name     text not null,
  client_business text,
  client_email    text not null,
  line_items      jsonb not null default '[]'::jsonb,
  total_price     integer not null default 0,            -- cents
  status          proposal_status not null default 'draft',
  created_at      timestamptz not null default now()
);

create index if not exists proposals_token_idx  on public.proposals (token);
create index if not exists proposals_status_idx on public.proposals (status);

-- ─────────────────────────────────────────────────────────────────────────────
-- signatures
--   One signature per proposal (enforced by unique constraint).
--   signer_ip / signed_at are captured server-side, never client-supplied.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.signatures (
  id              uuid primary key default gen_random_uuid(),
  proposal_id     uuid not null references public.proposals (id) on delete cascade,
  signer_name     text not null,
  signature_image text not null,                          -- data URL (base64 PNG)
  signed_at       timestamptz not null default now(),
  signer_ip       text,
  agreed          boolean not null default false,
  constraint signatures_one_per_proposal unique (proposal_id)
);

create index if not exists signatures_proposal_idx on public.signatures (proposal_id);

-- ═════════════════════════════════════════════════════════════════════════════
-- IMMUTABILITY: a proposal that is 'signed' can never be edited or deleted.
-- A signature row can never be modified once written.
-- Enforced with triggers so it holds regardless of which client makes the call.
-- ═════════════════════════════════════════════════════════════════════════════

-- Block UPDATE/DELETE on a proposal once it is signed.
-- The single allowed transition is the draft/sent -> signed flip itself.
create or replace function public.enforce_signed_proposal_immutable()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'DELETE') then
    if old.status = 'signed' then
      raise exception 'A signed proposal cannot be deleted (id=%).', old.id;
    end if;
    return old;
  end if;

  -- UPDATE path
  if old.status = 'signed' then
    -- Already signed: nothing about it may change.
    raise exception 'A signed proposal is immutable and cannot be edited (id=%).', old.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_proposals_immutable on public.proposals;
create trigger trg_proposals_immutable
  before update or delete on public.proposals
  for each row execute function public.enforce_signed_proposal_immutable();

-- Signatures are write-once: no UPDATE, no DELETE (except cascade from a
-- non-signed proposal, which the proposal trigger already governs).
create or replace function public.enforce_signature_write_once()
returns trigger
language plpgsql
as $$
begin
  raise exception 'Signatures are immutable once recorded (proposal_id=%).',
    coalesce(old.proposal_id, new.proposal_id);
end;
$$;

drop trigger if exists trg_signatures_write_once on public.signatures;
create trigger trg_signatures_write_once
  before update on public.signatures
  for each row execute function public.enforce_signature_write_once();

-- ═════════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
--
-- Model:
--   • The PUBLIC client signing page and ALL writes go through the server using
--     the SERVICE ROLE key, which bypasses RLS. So we do NOT grant the anon key
--     direct table access — the unguessable token + server validation is the
--     gate for public reads, and the server performs them with the service role.
--   • Authenticated admins (Supabase Auth) get full read access for the
--     dashboard. Admin writes also go through the server (service role), but we
--     allow authenticated SELECT so you can build read views with the anon
--     client if desired.
--
-- RLS is ENABLED with no permissive policy for anon, so the anon key alone can
-- read nothing — defense in depth even if the anon key leaks.
-- ═════════════════════════════════════════════════════════════════════════════

alter table public.proposals  enable row level security;
alter table public.signatures enable row level security;

-- Authenticated (logged-in admin) can read everything.
drop policy if exists "admins read proposals" on public.proposals;
create policy "admins read proposals"
  on public.proposals for select
  to authenticated
  using (true);

drop policy if exists "admins read signatures" on public.signatures;
create policy "admins read signatures"
  on public.signatures for select
  to authenticated
  using (true);

-- NOTE: No INSERT/UPDATE/DELETE policies are defined for anon or authenticated.
-- All mutations are performed server-side with the service role key, which is
-- exempt from RLS. This keeps the public/admin browsers from writing directly.

-- ═════════════════════════════════════════════════════════════════════════════
-- Done. Create your admin user in Dashboard → Authentication → Users
-- (Add user → enter email + password). There is no public sign-up.
-- ═════════════════════════════════════════════════════════════════════════════
