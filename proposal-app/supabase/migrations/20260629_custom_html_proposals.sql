-- Adds custom HTML/CSS proposal kind support.
-- This migration only updates constraints; it does not edit proposal rows, so
-- signed proposals remain untouched and immutable.

do $$
begin
  if exists (
    select 1
      from pg_constraint
     where conname = 'proposals_proposal_kind_check'
       and conrelid = 'public.proposals'::regclass
  ) then
    alter table public.proposals
      drop constraint proposals_proposal_kind_check;
  end if;

  alter table public.proposals
    add constraint proposals_proposal_kind_check
    check (proposal_kind in ('template', 'uploaded_pdf', 'custom_html'));
end$$;
