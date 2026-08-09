-- Admin delete for proposals (including signed ones).
--
-- Background: trg_proposals_immutable blocks DELETE on a signed proposal, and
-- trg_signatures_write_once blocks DELETE on any signature row (which also
-- blocks the ON DELETE CASCADE from proposals). That immutability is the point
-- for real client agreements, so this migration does NOT remove it. Instead it
-- adds a single audited escape hatch: both triggers now allow a DELETE when the
-- transaction-local setting `app.allow_admin_delete` is 'on', and only
-- admin_delete_proposal() sets it. Direct DELETEs — even with the service-role
-- key — still hit the original guard.

-- ─────────────────────────────────────────────────────────────────────────────
-- Proposal immutability: still blocks edits to a signed proposal; allows DELETE
-- only inside admin_delete_proposal().
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.enforce_signed_proposal_immutable()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'DELETE') then
    if old.status = 'signed'
       and coalesce(current_setting('app.allow_admin_delete', true), 'off') <> 'on' then
      raise exception 'A signed proposal cannot be deleted (id=%).', old.id;
    end if;
    return old;
  end if;

  -- UPDATE path — unchanged: a signed proposal is never editable.
  if old.status = 'signed' then
    raise exception 'A signed proposal is immutable and cannot be edited (id=%).', old.id;
  end if;

  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Signatures: still write-once (no UPDATE ever, no ad-hoc DELETE); the cascade
-- from an admin proposal delete is allowed through.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.enforce_signature_write_once()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE'
     and coalesce(current_setting('app.allow_admin_delete', true), 'off') = 'on' then
    return old;
  end if;

  raise exception 'Signatures are immutable once recorded (proposal_id=%).',
    coalesce(old.proposal_id, new.proposal_id);
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- The one path allowed to delete a proposal. Called by the admin API route with
-- the service-role key; browsers cannot execute it.
--
-- `set_config(..., true)` makes the flag transaction-local, so it is cleared
-- automatically when this statement's transaction ends.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.admin_delete_proposal(p_proposal_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer;
begin
  perform set_config('app.allow_admin_delete', 'on', true);

  delete from public.proposals p where p.id = p_proposal_id;
  get diagnostics v_deleted = row_count;

  perform set_config('app.allow_admin_delete', 'off', true);

  return v_deleted > 0;
end;
$$;

revoke all on function public.admin_delete_proposal(uuid) from public;
grant execute on function public.admin_delete_proposal(uuid) to service_role;
