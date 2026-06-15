# Tenant Management System (TMS)

A web-based, installable **PWA** for managing rental properties, leases, rent, maintenance,
complaints, and two-way ratings — with three role-based portals in a single app:

- **Master Admin** → `/admin`
- **Landlord** → `/landlord`
- **Tenant** → `/tenant`

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) — webpack build |
| Styling | Tailwind CSS v4 |
| Database | PostgreSQL + Prisma 6 |
| Auth / RBAC | Auth.js v5 (credentials, JWT sessions) + role-aware proxy |
| PWA | Serwist (service worker, offline cache, Web Push) |
| Deploy | Docker + docker-compose (app + Postgres) |

Planned integrations (env placeholders already in `.env.example`): **Razorpay** (UPI/cards/netbanking),
**Cloudflare R2** (documents/images), **Resend** (email), **Web Push** (VAPID).

## Local development

```bash
# 1. Start Postgres (or use docker compose just for the db)
#    Update DATABASE_URL in .env if needed.

# 2. Install + generate client
npm install
npm run db:generate

# 3. Create the schema and seed demo users
npm run db:push   # or: npm run db:migrate  (creates a migration)
npm run db:seed

# 4. Run
npm run dev       # http://localhost:3000
```

> Note: the build uses **webpack** (`next build --webpack`) because Serwist v9
> does not yet support Turbopack. The service worker is disabled in dev.

### Demo logins (after seeding)

| Role | Email | Password |
|---|---|---|
| Master Admin | `admin@tms.local` | `Password123!` |
| Landlord | `landlord@tms.local` | `Password123!` |
| Tenant | `tenant@tms.local` | `Password123!` |

## Production (single VPS)

```bash
# Set secrets first (POSTGRES_PASSWORD, AUTH_SECRET) in a .env or shell.
docker compose up -d --build
```

This starts Postgres, runs `prisma db push` + seed once, then the app on port 3000.
Put **Caddy** or **Nginx** in front for HTTPS (required for PWA install + Web Push).

Generate a real auth secret with `npx auth secret`.

## Project layout

```
prisma/schema.prisma     # full data model (users, properties, leases, invoices,
                         #   payments, maintenance, complaints, ratings, audit…)
prisma/seed.ts           # demo data
src/auth.ts              # Auth.js (Node): credentials + bcrypt + Prisma
src/auth.config.ts       # edge-safe auth config (shared with proxy)
src/proxy.ts             # route protection + role scoping (Next 16 "proxy")
src/app/sw.ts            # Serwist service worker (+ Web Push handlers)
src/app/manifest.ts      # PWA manifest (standalone, shortcuts, icons)
src/app/login/           # sign-in
src/app/admin|landlord|tenant/   # the three portals (shared PortalShell)
src/components/          # PortalShell (bottom-nav app shell), StatCard, InstallPrompt
```

## What's scaffolded vs. next

**Done:** auth + RBAC, role dashboards with live counts, installable PWA shell with
bottom-tab navigation, Web Push plumbing, data model for every SRS entity, Docker deploy.

**Next to build (per SRS):** CRUD screens for properties/leases/tenants, Razorpay rent
payment flow + invoice/receipt PDFs, maintenance & complaint workflows, rating submission
after lease end, reporting/analytics, audit-log writes, and R2 file uploads.
