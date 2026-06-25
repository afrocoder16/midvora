# Midvora Proposals

A self-contained Next.js app for sending clients a unique link to read, sign, and
download a branded proposal — no client login required. Both the client and
`info@Midvora.com` get an emailed PDF copy. Admin proposal management lives behind
Supabase Auth.

> This lives in `proposal-app/` inside the Midvora website repo and deploys as its
> **own** Vercel project (separate from the Astro marketing site). Target domain:
> **sign.midvora.com**.

## Stack

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** (Button, Input, Label, Card, Dialog, Table)
- **Supabase** — Postgres database + admin auth
- **Resend** — transactional email with PDF attachment
- **signature_pad** — touch/mouse signature canvas
- **@react-pdf/renderer** — signed-PDF generation

## Routes

| Route | Auth | Purpose |
|---|---|---|
| `/proposal/[token]` | public | Client reads + signs; shows read-only signed view if already signed |
| `/api/sign` (POST) | public (token-gated) | Saves signature, captures IP + timestamp server-side, flips status to `signed`, emails PDF |
| `/api/proposal/[token]/pdf` (GET) | public (signed only) | Streams the signed PDF for download |
| `/admin` | Supabase Auth | Create proposals, copy share link, list all proposals |
| `/admin/login` | public | Email/password sign in |
| `/api/admin/proposals` (POST) | Supabase Auth | Create a draft proposal + generate token |

---

## 1. Supabase setup

1. Create a project at <https://supabase.com>.
2. Open **SQL Editor → New query**, paste the contents of
   [`supabase/schema.sql`](./supabase/schema.sql), and run it. This creates:
   - `proposals` and `signatures` tables (money stored in **integer cents**)
   - triggers that make a **signed proposal immutable** and signatures **write-once**
   - Row Level Security: anon key can read/write **nothing** directly; all writes go
     through the server using the service-role key; logged-in admins can read.
3. Create your admin user under **Authentication → Users → Add user**
   (enter email + password). There is **no public sign-up**.
4. Grab your keys from **Project Settings → API**:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (secret) → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Resend setup

1. Create an account at <https://resend.com>.
2. **Add & verify your sending domain** (e.g. `midvora.com`) under **Domains**.
   The `from` address must use a verified domain.
3. Create an API key under **API Keys** → `RESEND_API_KEY`.
4. Set `RESEND_FROM_EMAIL` (e.g. `Midvora <proposals@midvora.com>`) and
   `INTERNAL_NOTIFY_EMAIL` (`info@Midvora.com`).

## 3. Environment variables

Copy the example and fill it in:

```bash
cp .env.example .env.local
```

| Var | Where |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` locally; `https://sign.midvora.com` in prod |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (**server-only secret**) |
| `RESEND_API_KEY` | Resend → API Keys |
| `RESEND_FROM_EMAIL` | verified sender, e.g. `Midvora <proposals@midvora.com>` |
| `INTERNAL_NOTIFY_EMAIL` | `info@Midvora.com` |

Secrets are never committed (`.env*` is gitignored). In production, set these in the
Vercel project's **Environment Variables**.

## 4. Run locally

```bash
cd proposal-app
npm install
npm run dev
```

- App: <http://localhost:3000>
- Admin: <http://localhost:3000/admin> (redirects to login)
- After creating a proposal you'll get a copyable link like
  `http://localhost:3000/proposal/<token>` — open it to test the signing flow.

> **Tip for testing email locally:** Resend will only deliver from a verified
> domain. Until your domain is verified you can use Resend's `onboarding@resend.dev`
> sender to email your own verified account address.

## 5. Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel, **New Project** → import the repo.
3. Set **Root Directory** to `proposal-app`.
4. Add all environment variables (set `NEXT_PUBLIC_APP_URL=https://sign.midvora.com`).
5. Deploy. Then add the domain **sign.midvora.com** under the project's
   **Domains** and point a DNS `CNAME` record at Vercel as instructed.
6. HTTPS is enforced automatically by Vercel; HSTS + other security headers are set
   in [`next.config.mjs`](./next.config.mjs).

## Security notes

- **Tokens** are 256-bit random, base64url-encoded — unguessable, never sequential.
- **IP + timestamp** for a signature are captured **server-side** from request
  headers — never accepted from the client body.
- **Immutability** is enforced at the database level (Postgres triggers), not just
  in app code: a signed proposal cannot be edited or deleted, and a signature row
  cannot be modified once written.
- **Input** is validated/sanitized with Zod (trim, length caps, strip control
  chars, email + image-format checks) before touching the database.
- **Admin routes** are guarded by middleware + Supabase Auth; the service-role key
  is `server-only` and never shipped to the browser.

## Project layout

```
proposal-app/
├── app/
│   ├── proposal/[token]/page.tsx        # client signing page
│   ├── admin/                           # login, dashboard, layout, logout
│   └── api/
│       ├── sign/route.ts                # sign + PDF + email
│       ├── proposal/[token]/pdf/route.ts# download signed PDF
│       └── admin/proposals/route.ts     # create proposal (admin)
├── components/                          # UI + feature components
│   └── ui/                              # shadcn primitives
├── lib/                                 # supabase clients, pdf, email, validation…
├── supabase/schema.sql                  # tables + RLS + immutability triggers
├── middleware.ts                        # admin auth guard + session refresh
└── .env.example
```
