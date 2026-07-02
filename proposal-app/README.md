# Midvora Proposals

A self-contained Next.js app for sending clients a unique link to read, sign, and
download a branded proposal. The active admin workflow is PDF-first: upload the
finished proposal PDF, send a token-gated link, and after acceptance Midvora
appends a signed certificate page to the downloaded copy. Both the client and
`info@Midvora.com` get an emailed PDF copy.

This lives in `proposal-app/` inside the Midvora website repo and deploys as its
own Vercel project, separate from the Astro marketing site. Target domain:
`sign.midvora.com`.

For developer onboarding, architecture, data flow, migrations, troubleshooting,
and refactoring notes, read [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md).

## Stack

- Next.js App Router and TypeScript
- Tailwind CSS and shadcn/ui primitives
- Supabase Postgres, Storage, and admin auth
- Resend transactional email
- `signature_pad` for touch/mouse signatures
- `@react-pdf/renderer` for legacy template signed PDFs
- `pdf-lib` to append signed certificate pages to uploaded PDFs
- `puppeteer-core` and `@sparticuz/chromium` to print custom HTML/CSS proposals
- `sanitize-html` to strip unsafe custom markup before public render

## Proposal Modes

- `uploaded_pdf`: current admin workflow for finished PDFs that need exact print
  fidelity. The client previews the uploaded PDF and the signed PDF appends a
  certificate page.
- `custom_html`: dormant backend support. The admin UI does not expose this mode
  while the PDF workflow is the active product path.
- `template`: legacy guided-section mode kept for existing rows, but no longer
  shown as the primary admin creation workflow.

If `custom_html` is re-enabled later, custom proposal code is HTML/CSS only.
JavaScript, forms, iframes, embeds, external CSS imports, and remote image/script
assets are stripped or blocked.

## Routes

| Route | Auth | Purpose |
|---|---|---|
| `/proposal/[token]` | public | Client reads and signs; shows read-only signed view after signing |
| `/api/sign` | public token-gated POST | Saves signature, captures IP and timestamp, flips status to signed, emails PDF |
| `/api/proposal/[token]/pdf` | public signed-only GET | Streams the signed PDF for download |
| `/api/proposal/[token]/custom-html` | public token-gated GET | Streams sanitized custom HTML/CSS documents |
| `/api/proposal/[token]/logo` | public token-gated GET | Streams private client logo assets |
| `/api/proposal/[token]/source-pdf` | public token-gated GET | Streams uploaded proposal PDFs for preview |
| `/admin` | Supabase Auth | Create proposals, copy share link, list all proposals |
| `/admin/login` | public | Email/password sign in |
| `/api/admin/proposals` | Supabase Auth POST | Create a sent proposal and generate token |

## Supabase Setup

1. Create a project at <https://supabase.com>.
2. Open SQL Editor, paste [`supabase/schema.sql`](./supabase/schema.sql), and run
   it. This creates:
   - `proposals` and `signatures` tables
   - signed-proposal immutability triggers
   - write-once signature triggers
   - `record_proposal_signature`, a service-role-only signing function
   - private Storage bucket `proposal-assets`
   - RLS policies where anon can read/write nothing directly
3. Create your admin user under Authentication -> Users -> Add user.
4. Copy keys from Project Settings -> API.

For existing projects, apply the SQL files in [`supabase/migrations`](./supabase/migrations).
The custom HTML migration only updates the `proposal_kind` check constraint and
does not edit signed proposal rows.

## Resend Setup

1. Create an account at <https://resend.com>.
2. Add and verify your sending domain.
3. Create an API key.
4. Set `RESEND_FROM_EMAIL` and `INTERNAL_NOTIFY_EMAIL`.

## Environment Variables

Copy the example and fill it in:

```bash
cp .env.example .env.local
```

| Var | Where |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Settings -> API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Settings -> API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Settings -> API, server-only secret |
| `RESEND_API_KEY` | Resend API Keys |
| `RESEND_FROM_EMAIL` | verified sender, for example `Midvora <proposals@midvora.com>` |
| `INTERNAL_NOTIFY_EMAIL` | `info@Midvora.com` |
| `PUPPETEER_EXECUTABLE_PATH` | optional local Chrome/Edge path if auto-detection fails |

Secrets are never committed. In production, set them in the Vercel project's
Environment Variables.

## Run Locally

```bash
cd proposal-app
npm install
npm run dev
```

- App: <http://localhost:3000>
- Admin: <http://localhost:3000/admin>
- Proposal links look like `http://localhost:3000/proposal/<token>`.

## Verify Locally

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run check` runs all four commands in sequence.

## Deploy To Vercel

1. Push this repo to GitHub.
2. In Vercel, import the repo as a new project.
3. Set Root Directory to `proposal-app`.
4. Add all environment variables.
5. Deploy, then add `sign.midvora.com` under Domains.

Proposal share links are generated from the incoming request host. This keeps
Vercel preview deployments on their preview URL and production links on
`sign.midvora.com`.

## Security Notes

- Tokens are 256-bit random and never sequential.
- IP and timestamp are captured server-side when signing.
- Signed proposals and signatures are immutable at the database level.
- Admin routes are guarded by middleware and Supabase Auth.
- Proposal assets are private and only served through token-gated server routes.
- Custom proposal code is sanitized and rendered with a strict Content Security
  Policy inside a sandboxed iframe. JavaScript is blocked in v1.

## Project Layout

```text
proposal-app/
+-- app/
|   +-- proposal/[token]/page.tsx
|   +-- admin/
|   +-- api/
|       +-- sign/route.ts
|       +-- proposal/[token]/pdf/route.ts
|       +-- proposal/[token]/custom-html/route.ts
|       +-- proposal/[token]/logo/route.ts
|       +-- proposal/[token]/source-pdf/route.ts
|       +-- admin/proposals/route.ts
+-- components/
+-- lib/
+-- supabase/schema.sql
+-- supabase/migrations/
+-- tests/
+-- middleware.ts
+-- .env.example
```
