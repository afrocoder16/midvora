import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const schema = readFileSync(join(__dirname, "../supabase/schema.sql"), "utf8");
const atomicSigningMigration = readFileSync(
  join(__dirname, "../supabase/migrations/20260629_atomic_signing.sql"),
  "utf8"
);
const hybridMigration = readFileSync(
  join(__dirname, "../supabase/migrations/20260629_hybrid_proposals.sql"),
  "utf8"
);
const customHtmlMigration = readFileSync(
  join(__dirname, "../supabase/migrations/20260629_custom_html_proposals.sql"),
  "utf8"
);
const fixSigningRpcMigration = readFileSync(
  join(__dirname, "../supabase/migrations/20260702_fix_signing_rpc_ambiguous_id.sql"),
  "utf8"
);

describe("Supabase schema invariants", () => {
  it("blocks both updates and deletes on signatures", () => {
    expect(schema).toContain("before update or delete on public.signatures");
  });

  it("provides an atomic service-role-only signing function", () => {
    expect(schema).toContain("create or replace function public.record_proposal_signature");
    expect(schema).toContain("where p.id = p_proposal_id");
    expect(schema).toContain("returning * into v_signature;");
    expect(schema).toContain("grant execute on function public.record_proposal_signature");
    expect(schema).toContain("to service_role;");
  });

  it("repairs historical signature/status mismatches in the migration", () => {
    expect(atomicSigningMigration).toContain("set status = 'signed'");
    expect(atomicSigningMigration).toContain("from public.signatures s");
    expect(atomicSigningMigration).toContain("where s.proposal_id = p.id");
  });

  it("qualifies proposal ids inside signing RPC migrations", () => {
    expect(atomicSigningMigration).toContain("where p.id = p_proposal_id");
    expect(fixSigningRpcMigration).toContain("where p.id = p_proposal_id");
  });

  it("supports hybrid proposal records and private storage", () => {
    expect(schema).toContain("proposal_kind   text not null default 'template'");
    expect(schema).toContain("'custom_html'");
    expect(schema).toContain("proposal_content jsonb not null default '{}'::jsonb");
    expect(schema).toContain("source_pdf_path text");
    expect(schema).toContain("uploaded_pdf_requires_file");
    expect(schema).toContain("'proposal-assets'");
  });

  it("upgrades existing projects with the hybrid migration", () => {
    expect(hybridMigration).toContain("add column if not exists proposal_kind");
    expect(hybridMigration).toContain("add column if not exists source_pdf_path");
    expect(hybridMigration).toContain("where status <> 'signed'");
    expect(hybridMigration).toContain("'custom_html'");
    expect(hybridMigration).toContain("insert into storage.buckets");
  });

  it("upgrades proposal kind constraints for custom HTML without editing rows", () => {
    expect(customHtmlMigration).toContain("drop constraint proposals_proposal_kind_check");
    expect(customHtmlMigration).toContain("'custom_html'");
    expect(customHtmlMigration).not.toContain("update public.proposals");
  });
});
