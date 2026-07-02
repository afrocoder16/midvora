# Midvora Proposal App Developer Guide

This guide is for developers working on `proposal-app`, the standalone Next.js
application used to create, send, sign, and download Midvora proposals.

The current production workflow is PDF-first:

1. Admin uploads a finished proposal PDF.
2. App stores the PDF in private Supabase Storage.
3. Client opens an unguessable token link.
4. Client signs.
5. Supabase atomically records the signature and marks the proposal signed.
6. App generates a signed PDF by appending a certificate page to the uploaded PDF.
7. Client and admin can download the signed PDF.

Custom HTML/CSS proposal support exists in the codebase but is paused in the
admin UI. Treat it as dormant until explicitly re-enabled.

## Repository Layout

```text
midvora-website/
+-- src/                         Astro marketing site
+-- public/                      Marketing assets
+-- proposal-app/                Next.js proposal signing app
    +-- app/                     Next App Router pages and route handlers
    +-- components/              UI and feature components
    +-- lib/                     Domain logic, Supabase, validation, PDF, email
    +-- supabase/                Schema and migrations
    +-- tests/                   Vitest tests
```

The Astro app and proposal app are separate projects. The proposal app should be
deployed as its own Vercel project with root directory `proposal-app`.

## Runtime Architecture

### Frontend

- Next.js App Router.
- Tailwind CSS.
- shadcn-style local UI primitives in `components/ui`.
- Admin routes are protected by Supabase Auth middleware.
- Public proposal pages are protected by a random proposal token, not login.

### Backend

- Next.js route handlers provide all public/admin mutations.
- Supabase service-role client is used server-side only.
- Supabase RLS denies direct anon writes.
- Proposal assets live in a private Supabase Storage bucket.
- Signed PDFs are generated server-side on demand.

### Database

Core tables:

- `public.proposals`
- `public.signatures`

Core database function:

- `public.record_proposal_signature(...)`

Important invariants:

- Signed proposals cannot be edited or deleted.
- Signature rows are write-once.
- Signing is atomic: signature insert and proposal status update happen in one DB
  function.
- One signature per proposal is enforced by a unique constraint.

## Request And Data Flow

### Admin Creates Uploaded PDF Proposal

Files involved:

- `components/create-proposal-form.tsx`
- `app/api/admin/proposals/route.ts`
- `lib/validation.ts`
- `lib/storage.ts`
- `lib/token.ts`
- `lib/proposals.ts`

Flow:

1. Admin fills client fields and uploads a source PDF.
2. Browser sends multipart form data to `/api/admin/proposals`.
3. Route verifies Supabase Auth session.
4. Route parses `payload` JSON from multipart body.
5. Route validates input through `createProposalSchema`.
6. Route validates uploaded files.
7. App generates a random token.
8. PDF and optional logo are uploaded to private Storage.
9. Proposal row is inserted with `status = 'sent'`.
10. Route returns share URL `/proposal/[token]`.

### Client Views Proposal

Files involved:

- `app/proposal/[token]/page.tsx`
- `lib/proposals.ts`
- `components/proposal-view.tsx`
- `app/api/proposal/[token]/source-pdf/route.ts`
- `app/api/proposal/[token]/logo/route.ts`

Flow:

1. Client opens `/proposal/[token]`.
2. Server loads proposal by token with service role.
3. Server loads signature if it exists.
4. Uploaded PDF proposals render an iframe pointed at the token-gated source PDF
   route.
5. If proposal is unsigned, page shows `SignForm`.
6. If proposal is signed, page shows signed metadata and download button.

### Client Signs Proposal

Files involved:

- `components/sign-form.tsx`
- `components/signature-canvas.tsx`
- `app/api/sign/route.ts`
- `lib/validation.ts`
- `lib/ip.ts`
- `supabase/migrations/20260702_fix_signing_rpc_ambiguous_id.sql`

Flow:

1. Client types legal name, draws signature, checks agreement box.
2. Browser POSTs JSON to `/api/sign`.
3. Route validates the token, signer name, agreement, and PNG data URL.
4. Route loads proposal by token.
5. Route rejects already-signed proposal.
6. Route captures IP and server timestamp.
7. Route calls `record_proposal_signature`.
8. DB inserts signature and flips proposal status to `signed` atomically.
9. App generates signed PDF and emails it.
10. Email/PDF errors are logged but do not undo the saved signature.

### Signed PDF Download

Files involved:

- `app/api/proposal/[token]/pdf/route.ts`
- `lib/pdf.tsx`
- `lib/storage.ts`

Flow:

1. Client/admin requests `/api/proposal/[token]/pdf`.
2. Route verifies proposal is signed and has a signature.
3. For uploaded PDFs, app downloads original PDF from Storage.
4. App appends a certificate page with `pdf-lib`.
5. Route streams the generated PDF as an attachment.

## Important Files

### App Routes

- `app/admin/page.tsx`
  Admin dashboard composition. Loads proposal summaries and renders the create
  form plus proposal table.

- `app/api/admin/proposals/route.ts`
  Authenticated proposal creation endpoint.

- `app/api/sign/route.ts`
  Public token-gated signing endpoint.

- `app/api/proposal/[token]/pdf/route.ts`
  Signed PDF download endpoint.

- `app/api/proposal/[token]/source-pdf/route.ts`
  Token-gated preview route for uploaded source PDFs.

- `app/api/proposal/[token]/logo/route.ts`
  Token-gated client logo asset route.

### Components

- `components/create-proposal-form.tsx`
  PDF-only admin create form.

- `components/admin-proposals-table.tsx`
  Admin table, status display, copy link, signed PDF download action.

- `components/proposal-view.tsx`
  Public proposal display.

- `components/sign-form.tsx`
  Client signature form.

- `components/signature-canvas.tsx`
  Signature pad wrapper.

### Domain Libraries

- `lib/proposals.ts`
  Data access and normalization for proposal records.

- `lib/validation.ts`
  Zod schemas and input sanitation.

- `lib/storage.ts`
  Supabase Storage upload/download helpers.

- `lib/pdf.tsx`
  Signed PDF generation.

- `lib/email.ts`
  Signed proposal email sending.

- `lib/api-errors.ts`
  Centralized API error response mapping.

- `lib/proposal-kind.ts`
  Shared proposal kind labels/defaults.

- `lib/custom-html.ts`
  Dormant custom HTML/CSS sanitizer and document builder.

## Environment Variables

Required:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
INTERNAL_NOTIFY_EMAIL
```

Optional:

```text
PUPPETEER_EXECUTABLE_PATH
```

Proposal share links are generated from the current request origin. Do not force
`NEXT_PUBLIC_APP_URL` in Vercel preview deployments; doing so can make preview
admins copy production-domain client links before production has the same build.

`PUPPETEER_EXECUTABLE_PATH` only matters if custom HTML/CSS PDF rendering is
re-enabled locally.

## Supabase Setup And Migrations

For a fresh Supabase project, run:

```text
supabase/schema.sql
```

For existing projects, apply migrations in chronological order:

```text
supabase/migrations/20260629_hybrid_proposals.sql
supabase/migrations/20260629_atomic_signing.sql
supabase/migrations/20260629_custom_html_proposals.sql
supabase/migrations/20260702_fix_signing_rpc_ambiguous_id.sql
```

The most important migration for current PDF signing reliability is:

```text
20260702_fix_signing_rpc_ambiguous_id.sql
```

Without it, signing can fail with:

```text
42702 column reference "id" is ambiguous
```

## Current Proposal Modes

Supported in database/code:

- `uploaded_pdf`
- `template`
- `custom_html`

Visible in admin UI:

- `uploaded_pdf`

Do not remove dormant modes without also updating:

- database constraints
- historical rows
- validation tests
- PDF generation fallback logic
- public proposal rendering

## Security Model

- Admin uses Supabase Auth.
- Public proposal access uses random 256-bit URL-safe tokens.
- Service-role key is server-only.
- Browser never writes directly to Supabase tables.
- Assets are stored in a private Supabase bucket.
- Source PDFs and logos are served only through token-gated routes.
- Signatures and signed proposals are immutable at the DB level.

Security-sensitive files:

- `middleware.ts`
- `lib/supabase/admin.ts`
- `lib/supabase/server.ts`
- `app/api/sign/route.ts`
- `supabase/schema.sql`

## Testing And Verification

Run from `proposal-app`:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Full check:

```bash
npm run check
```

The build can be slow on Windows. If a build process hangs, stop stale `next`
and `node` processes before retrying.

## Local Run

Development:

```bash
npm run dev
```

Production-style local run:

```bash
npm run build
npm run start -- -H 127.0.0.1 -p 3000
```

During recent work, `next dev` occasionally hung on this Windows setup after
dependency and route changes. `next start` after a clean build has been more
reliable for validating behavior locally.

## Known Risks

### 1. Signed PDFs Are Generated On Demand

Every download rebuilds the signed PDF. This is acceptable at low volume, but
will become expensive with larger PDFs or frequent admin downloads.

Recommended future change:

- Generate the signed PDF once after signing.
- Store it in private Supabase Storage.
- Serve the cached signed PDF for future downloads.

### 2. `lib/pdf.tsx` Is Too Large

It currently handles:

- React PDF template rendering
- uploaded PDF certificate appending
- dormant custom HTML Chromium printing
- certificate layout details
- font/color helpers

Recommended future split:

```text
lib/pdf/
+-- index.ts
+-- uploaded-pdf.ts
+-- template-pdf.tsx
+-- custom-html-pdf.ts
+-- certificate.ts
+-- pdf-utils.ts
```

### 3. Dormant Custom HTML/CSS Code Adds Maintenance Weight

Custom HTML/CSS is hidden from admin but still exists. Keeping dormant code is
fine short-term, but it should either be feature-flagged or removed if PDF-only
is the long-term product direction.

Recommended future change:

```text
ENABLE_CUSTOM_HTML_PROPOSALS=false
```

Use that flag to gate routes, validation, and UI.

### 4. Error Logging Is Console-Only

Production should not rely only on `console.error`.

Recommended future change:

- Add structured server logging.
- Include request path, proposal id/token hash, and Supabase error code.
- Avoid logging full signatures, service keys, or full PDFs.

### 5. No End-To-End Signing Test

Unit tests cover schemas and SQL invariants, but not the full workflow.

Recommended future test:

```text
create PDF proposal -> sign proposal -> download signed PDF
```

## Common Troubleshooting

### Could not create proposal

Likely causes:

- Missing Supabase migration.
- Storage bucket `proposal-assets` missing.
- Uploaded file type/size rejected.
- Admin session expired.

Check:

- Browser network response body.
- Server logs from `/api/admin/proposals`.
- Supabase table constraint errors.

### Could not save signature

Likely causes:

- Missing `20260702_fix_signing_rpc_ambiguous_id.sql`.
- Proposal already signed.
- Supabase function missing or not granted to service role.

Check:

```sql
select proname
from pg_proc
where proname = 'record_proposal_signature';
```

### Download signed PDF fails

Likely causes:

- Proposal status is not `signed`.
- Signature row missing.
- Source PDF missing from Storage.
- Uploaded source PDF is corrupt.

Check:

```sql
select id, token, status, source_pdf_path
from public.proposals
where token = '<token>';

select *
from public.signatures
where proposal_id = '<proposal_id>';
```

### Uploaded PDF preview does not load

Likely causes:

- Wrong token.
- Proposal is not `uploaded_pdf`.
- Storage path missing.
- Browser has stale cached app state.

Check route:

```text
/api/proposal/[token]/source-pdf
```

## Refactoring Rules For Future Developers

- Keep route handlers thin.
- Keep Supabase access in `lib/*` helpers where practical.
- Never import `createAdminClient` into client components.
- Do not bypass Zod schemas for user input.
- Do not mutate signed proposals in migrations.
- Prefer summary queries for dashboard/table views.
- Do not expose private Storage paths directly to browsers.
- Keep admin UI dense and workflow-focused.
- Add tests for migration-sensitive DB behavior.

## Deployment Checklist

Before deploy:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Confirm Vercel:

- Root directory: `proposal-app`
- Supabase service role key is present and server-only.
- Resend sender is verified.

Confirm Supabase:

- All migrations applied.
- `proposal-assets` bucket exists and is private.
- Admin user exists.
- RLS is enabled.
- `record_proposal_signature` is granted to `service_role`.

## Quick Mental Model

```text
Admin PDF upload
  -> /api/admin/proposals
  -> Supabase Storage + proposals row
  -> share token link
  -> /proposal/[token]
  -> /api/sign
  -> record_proposal_signature DB function
  -> signed proposal
  -> /api/proposal/[token]/pdf
  -> original PDF + certificate page
```

If something breaks, identify which arrow failed first.
