-- Fixes record_proposal_signature failing with:
--   42702 column reference "id" is ambiguous
-- because RETURNS TABLE exposes an output column named id inside PL/pgSQL.

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
