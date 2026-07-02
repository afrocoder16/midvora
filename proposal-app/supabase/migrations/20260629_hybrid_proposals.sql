-- Adds hybrid proposal support:
-- - app-built branded template proposals
-- - uploaded PDF proposals with a server-appended signature certificate
-- - private Supabase Storage for logos and source PDFs

alter table public.proposals add column if not exists proposal_kind text;
alter table public.proposals add column if not exists client_address text;
alter table public.proposals add column if not exists client_logo_path text;
alter table public.proposals add column if not exists client_logo_mime_type text;
alter table public.proposals add column if not exists brand_primary text;
alter table public.proposals add column if not exists brand_accent text;
alter table public.proposals add column if not exists proposal_title text;
alter table public.proposals add column if not exists proposal_content jsonb;
alter table public.proposals add column if not exists source_pdf_path text;
alter table public.proposals add column if not exists source_pdf_filename text;

-- Do not update signed proposals here. The immutability trigger should keep
-- signed rows untouched; the app normalizes null hybrid fields at read time.
update public.proposals
   set proposal_kind = coalesce(proposal_kind, 'template'),
       brand_primary = coalesce(brand_primary, '#1F5D2B'),
       brand_accent = coalesce(brand_accent, '#F96B2B'),
       proposal_title = coalesce(proposal_title, 'Website Proposal & Agreement'),
       proposal_content = coalesce(proposal_content, '{}'::jsonb)
 where status <> 'signed';

alter table public.proposals alter column proposal_kind set default 'template';
alter table public.proposals alter column brand_primary set default '#1F5D2B';
alter table public.proposals alter column brand_accent set default '#F96B2B';
alter table public.proposals alter column proposal_title set default 'Website Proposal & Agreement';
alter table public.proposals alter column proposal_content set default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'proposals_proposal_kind_check'
       and conrelid = 'public.proposals'::regclass
  ) then
    alter table public.proposals
      add constraint proposals_proposal_kind_check
      check (proposal_kind in ('template', 'uploaded_pdf', 'custom_html'));
  end if;

  if not exists (
    select 1
      from pg_constraint
     where conname = 'uploaded_pdf_requires_file'
       and conrelid = 'public.proposals'::regclass
  ) then
    alter table public.proposals
      add constraint uploaded_pdf_requires_file
      check (proposal_kind <> 'uploaded_pdf' or source_pdf_path is not null);
  end if;
end$$;

create index if not exists proposals_kind_idx on public.proposals (proposal_kind);

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
