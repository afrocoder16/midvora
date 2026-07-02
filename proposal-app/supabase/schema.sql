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
  proposal_kind   text not null default 'template'
                  check (proposal_kind in ('template', 'uploaded_pdf', 'custom_html')),
  client_name     text not null,
  client_business text,
  client_email    text not null,
  client_address  text,
  client_logo_path text,
  client_logo_mime_type text,
  brand_primary   text not null default '#1F5D2B',
  brand_accent    text not null default '#F96B2B',
  proposal_title  text not null default 'Website Proposal & Agreement',
  proposal_content jsonb not null default '{}'::jsonb,
  source_pdf_path text,
  source_pdf_filename text,
  line_items      jsonb not null default '[]'::jsonb,
  total_price     integer not null default 0,            -- cents
  status          proposal_status not null default 'draft',
  created_at      timestamptz not null default now(),
  constraint uploaded_pdf_requires_file
    check (proposal_kind <> 'uploaded_pdf' or source_pdf_path is not null)
);

create index if not exists proposals_token_idx  on public.proposals (token);
create index if not exists proposals_status_idx on public.proposals (status);
create index if not exists proposals_kind_idx   on public.proposals (proposal_kind);

-- Private bucket for proposal logos and uploaded proposal PDFs. Files are read
-- and written only by server routes using the service-role key.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'proposal-assets',
  'proposal-assets',
  false,
  26214400,
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

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

-- Signatures are write-once: no UPDATE and no DELETE.
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
  before update or delete on public.signatures
  for each row execute function public.enforce_signature_write_once();

-- Atomically records a signature and flips the proposal to signed inside one
-- database transaction. The app calls this with the service-role key; browsers
-- cannot execute it directly.
create or replace function public.record_proposal_signature(
  p_proposal_id uuid,
  p_signer_name text,
  p_signature_image text,
  p_signer_ip text,
  p_signed_at timestamptz
)
returns table (
  id uuid,
  proposal_id uuid,
  signer_name text,
  signature_image text,
  signed_at timestamptz,
  signer_ip text,
  agreed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status public.proposal_status;
  v_signature public.signatures%rowtype;
begin
  select p.status
    into v_status
    from public.proposals p
   where p.id = p_proposal_id
   for update;

  if not found then
    raise exception 'Proposal not found (id=%).', p_proposal_id
      using errcode = 'P0002';
  end if;

  if v_status = 'signed' then
    raise exception 'This proposal has already been signed (id=%).', p_proposal_id
      using errcode = '23505';
  end if;

  insert into public.signatures (
    proposal_id,
    signer_name,
    signature_image,
    signed_at,
    signer_ip,
    agreed
  )
  values (
    p_proposal_id,
    p_signer_name,
    p_signature_image,
    p_signed_at,
    p_signer_ip,
    true
  )
  returning * into v_signature;

  update public.proposals p
     set status = 'signed'
   where p.id = p_proposal_id;

  return query
  select
    v_signature.id,
    v_signature.proposal_id,
    v_signature.signer_name,
    v_signature.signature_image,
    v_signature.signed_at,
    v_signature.signer_ip,
    v_signature.agreed;
exception
  when unique_violation then
    raise exception 'This proposal has already been signed (id=%).', p_proposal_id
      using errcode = '23505';
end;
$$;

revoke all on function public.record_proposal_signature(uuid, text, text, text, timestamptz)
  from public;
grant execute on function public.record_proposal_signature(uuid, text, text, text, timestamptz)
  to service_role;

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
