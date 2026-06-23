# Deploy: full mobile API (Tenant · Seeker · Landlord · Admin)

Hand this to whoever manages the `prebuildapps.com` server.

## What changed
The mobile REST API under **`src/app/api/mobile/v1/*`** was extended from the
original Tenant + Seeker surface to **all four portals**:

- `auth/*`, `me` — login, register (OTP), forgot/reset (unchanged)
- `tenant/*` — dashboard, lease, invoices, payments, maintenance, complaints, reviews, profile
- `listings`, `listings/{idOrRef}`, `account/*` — public seeker browse + account
- **`landlord/*`** — dashboard, properties, tenants, leases, invoices(+pay/remind), maintenance(+update), complaints(+respond), reviews, inquiries  ← **NEW**
- **`admin/*`** — dashboard, approvals, users(+suspend/activate), properties/{id}/approve, payments, reviews(+moderate), activity  ← **NEW**

Auth is **Bearer JWT** signed with the existing `AUTH_SECRET` (see
`src/lib/mobile-auth.ts`). **No database schema changes** — no migration needed.
Also: `src/lib/email.ts` got send timeouts; `src/lib/otp.ts` added a `reset`
purpose; `src/app/api/messages` and `src/app/api/upload` accept Bearer tokens.

## Why it's needed
The live server currently returns **404** for `/api/mobile/v1/landlord/*` and
`/api/mobile/v1/admin/*`, so the mobile app's landlord/admin logins fall back to
the tenant screen and get "Forbidden". Deploying this code fixes that.

## How to deploy (Docker, as per docker-compose.yml)
On the server, in the project directory:

```bash
# 1. Get the updated code (whichever matches how this server is sourced):
git pull            # if the server deploys from the git repo
#   …or copy the updated src/ from the provided archive/branch over the project.

# 2. Rebuild + restart the app container (DB and data are untouched):
docker compose up -d --build

# 3. Verify the new endpoints respond (401 = deployed & auth-gated; 404 = NOT deployed):
curl -s -o /dev/null -w "%{http_code}\n" https://prebuildapps.com/api/mobile/v1/landlord/dashboard
curl -s -o /dev/null -w "%{http_code}\n" https://prebuildapps.com/api/mobile/v1/admin/dashboard
```

A **401** on those two URLs means success (endpoint exists, needs a token).
A **404** means the new code didn't get built in.

## Important note about the current server code
The server's *current* mobile API (tenant/seeker) was deployed but is **not in
the GitHub repo** (`origin/main` has no `api/mobile`). The full code here is a
superset of it, so deploying this **replaces** the mobile API with the complete
4-portal version. One minor response-shape change: the listings endpoint returns
`pages` (the live one returned `totalPages`) — the mobile app already accepts
either, so nothing to do.

No `.env` / secret changes required. Same `DATABASE_URL`, same `AUTH_SECRET`.
