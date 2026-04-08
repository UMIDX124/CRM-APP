# Alpha Command Center

Enterprise CRM and operations hub for Alpha Corp's three brands (VCS, BSL, DPL).
Built as an installable PWA with real-time chat, AI-assisted deals/tickets,
sales pipeline, ticketing, lead capture webhooks, push notifications, and a
multi-tenant brand model.

## Tech stack

- **Framework:** Next.js 16 (App Router) on React 19
- **Language:** TypeScript (strict)
- **Database:** PostgreSQL via Prisma 7 (`@prisma/adapter-neon` for the Neon serverless driver)
- **Auth:** Custom session-cookie auth (`src/lib/auth.ts`) with bcrypt password hashing
- **Styling:** Tailwind CSS v4, Radix UI primitives, Lucide icons
- **AI:** AI SDK v6 with Groq (`llama-3.3-70b-versatile`) and Anthropic providers
- **Email:** Resend
- **Storage:** Vercel Blob for attachments
- **Realtime:** Server-Sent Events via `/api/events` (no polling)
- **Push:** `web-push` (VAPID) — subscribe + dispatch via service worker
- **Rate limiting:** `@upstash/ratelimit` with Upstash Redis (in-memory fallback)
- **Analytics:** `@vercel/analytics`
- **PWA:** Manifest + custom service worker (`public/sw.js`) with offline page

## Prerequisites

- Node.js **20+** (CI uses Node 20)
- A PostgreSQL database (Neon recommended — the project uses `@prisma/adapter-neon`)
- Optional: Resend account, Groq API key, Upstash Redis, Vercel Blob token, VAPID key pair

## Environment variables

Create a `.env.local` file in the repo root.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string (use Neon's pooled URL) |
| `AUTH_SECRET` | Yes | Random 32+ byte secret used to sign reset tokens |
| `APP_URL` | Yes (prod) | Public URL of the app, e.g. `https://fu-corp-crm.vercel.app` |
| `GROQ_API_KEY` | Optional | Enables the AI chat tab. Without it the chat is disabled |
| `RESEND_API_KEY` | Optional | Outbound email (ticket updates, password resets, lead alerts) |
| `EMAIL_FROM` | Optional | Verified sender, e.g. `Alpha CRM <crm@your-domain.com>` |
| `BLOB_READ_WRITE_TOKEN` | Optional | Vercel Blob token for file attachments |
| `UPSTASH_REDIS_REST_URL` | Optional | Distributed rate limiter (in-memory fallback otherwise) |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Paired with the URL above |
| `VAPID_PUBLIC_KEY` | Optional | Web push public key (`npx web-push generate-vapid-keys`) |
| `VAPID_PRIVATE_KEY` | Optional | Web push private key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Optional | Same value as `VAPID_PUBLIC_KEY`, exposed to the client |
| `VAPID_SUBJECT` | Optional | `mailto:` address required by web-push |
| `WEBHOOK_ALLOWED_ORIGINS` | Optional | Comma-separated CORS allow list for `/api/webhook/lead` |
| `LEAD_WEBHOOK_SECRET` | Recommended | HMAC secret used to verify the `X-Webhook-Signature` header on inbound leads |
| `GOOGLE_SHEETS_WEBHOOK_URL` | Optional | Forwarder URL for syncing leads to a Google Sheet |
| `NEXT_PUBLIC_SHOW_DEMO_LOGINS` | Optional | Set to `true` to render demo credentials on the login page |

The libraries that read these env vars (`src/lib/email.ts`, `src/lib/push.ts`,
`src/lib/ratelimit.ts`) all degrade gracefully when the keys are absent — they
log a one-time warning and become no-ops, so local development works with only
`DATABASE_URL` + `AUTH_SECRET` set.

## Local setup

```bash
# 1. Install dependencies (runs `prisma generate` automatically)
npm install

# 2. Create .env.local with at least DATABASE_URL and AUTH_SECRET

# 3. Push the schema to your database
npm run db:push

# 4. Seed real Alpha companies, brands, and 23 employees
npm run db:seed

# 5. Start the dev server
npm run dev
```

Open <http://localhost:3000> and sign in with one of the seeded employee
accounts. Default seed credentials are documented in
`scripts/seed-real-employees.mjs`.

## Database scripts

| Script | Description |
|---|---|
| `npm run db:push` | Apply the Prisma schema (no migrations) |
| `npm run db:seed` | Seed companies, brands, employees, channels |
| `npm run db:reset` | Wipe the DB, push schema, then re-seed |

Manual data scripts live in `scripts/` (e.g. `import-real-clients.mjs`,
`backfill-companies.mjs`, `seed-deals-tickets.mjs`).

## Testing

The repo currently has no automated test suite. CI runs:

- `npx tsc --noEmit` (TypeScript)
- `npm run lint` (ESLint, non-blocking)
- `npm run build` (production build)

See `.github/workflows/ci.yml`.

## Deployment

Production runs on **Vercel**.

1. Create a Vercel project linked to this repo.
2. Add every required env var from the table above to the Vercel project settings.
3. Push to `main` — Vercel builds and deploys automatically.
4. After the first deploy, run database migrations against the production
   Postgres URL: `DATABASE_URL=... npx prisma migrate deploy`.
5. Visit `/api/health` to verify the database connection and the latest
   applied migration.

The CSP in `next.config.ts` whitelists `https://va.vercel-scripts.com` so
Vercel Analytics works in production without inline-script violations.

## Project structure

```
src/
├── app/
│   ├── (dashboard)/     # Authenticated routes (sidebar layout)
│   │   ├── loading.tsx  # Group skeleton
│   │   ├── error.tsx    # Group error boundary
│   │   └── …
│   ├── api/             # Route handlers (50 endpoints)
│   ├── login/           # Public auth pages
│   ├── forgot-password/
│   ├── reset-password/
│   ├── layout.tsx       # Root layout — fonts, PWA prompt, Analytics
│   ├── error.tsx        # Root error boundary
│   └── not-found.tsx
├── components/          # React components (UnifiedChat, DealsModule, …)
├── hooks/               # SSE / push / presence hooks
├── lib/                 # auth, db, email, push, ratelimit, sla, sanitize, …
└── proxy.ts             # Next.js 16 proxy — defense-in-depth API auth gate
prisma/
├── schema.prisma        # 26 models (multi-brand, chat, deals, tickets, webhooks)
├── migrations/          # 8 SQL migrations
└── seed.ts
public/
├── sw.js                # Service worker (cache, push, notification clicks)
├── manifest.json
└── offline.html
.github/workflows/ci.yml # CI: type-check, lint, build
```

## Security model

- **Defense in depth:** `src/proxy.ts` rejects all `/api/*` requests without
  a session cookie before they reach a function. Every protected route handler
  also calls `requireAuth()` for an authoritative DB lookup.
- **CSP, HSTS, X-Frame-Options DENY, Permissions-Policy** etc. are set in
  `next.config.ts:33-48` and applied to every response.
- **Rate limiting** on auth (login, change-password, forgot-password,
  reset-password), AI chat, uploads, exports, bulk mutations, webhooks,
  message edits, and feedback.
- **Inbound lead webhook** at `/api/webhook/lead` verifies an HMAC-SHA256
  `X-Webhook-Signature` header against `LEAD_WEBHOOK_SECRET`. CORS origin
  allow list is enforced separately.
- **XSS:** user-generated chat content is sanitized via `src/lib/sanitize.ts`
  with a strict tag allow list (`b/i/em/strong/code/pre/a/br`).
- **Password resets** are stateless: tokens are HMAC-signed over the user's
  current `passwordHash`, so a successful reset automatically invalidates all
  prior tokens — no DB token table needed.

## License

Proprietary — internal Alpha Corp tooling. Not for redistribution.
