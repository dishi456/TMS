# Lease Lord — Mobile App ↔ Live Backend Connection Guide

This is the **only** doc you need to connect the Android app to live data.
Ignore the earlier Docker/VPS/git steps — the backend is **not** hosted that way (see "Hosting facts" at the bottom).

---

## 1. Base URL (set this in the app)

```
https://prebuildapps.com/api/mobile/v1
```

Point the app's API base URL here. Remove any `localhost`, mock, or staging URL.
All four portals (Seeker / Tenant / Landlord / Admin) live under this one base.

**Where this is set (in the app code — depends on your stack):**
- **React Native / Expo:** a `.env` file (`API_BASE_URL=...`) or a `config.ts` / `constants.js`
- **Flutter:** a constants file like `lib/config.dart`, or a `--dart-define` build flag
- **Native Android (Kotlin/Java):** `build.gradle` (`buildConfigField`), or the Retrofit/OkHttp
  client setup (`Constants.kt` / `ApiClient.kt`)

It's almost certainly currently pointing at `localhost` or a test URL — swap it to the live URL
above, then rebuild the APK.

## 2. Auth (Bearer JWT)

1. `POST /auth/login` with `{ "email": "...", "password": "..." }`
2. Response: `{ "token": "<jwt>", "user": { "id", "role", "fullName", "email", ... } }`
3. Send `Authorization: Bearer <token>` on **every** authenticated request.
4. Route the user by `user.role`: `TENANT` / `LANDLORD` / `MASTER_ADMIN` / `USER` (seeker).
5. Token is HS256, valid 30 days.

Other auth routes: `POST /auth/register` (OTP), `POST /auth/forgot` (emails a 6-digit code),
`POST /auth/reset { email, code, newPassword }`, `GET /me`.

## 3. Endpoints

Full request/response shapes for every endpoint are in **`MOBILE-API.md`** (shipped in the
deploy bundle). Summary by portal:

- **Tenant:** `/tenant/dashboard`, `/lease`, `/lease/notice`, `/invoices`, `/payments`,
  `/maintenance` (+POST, +`/{id}`), `/complaints` (+POST, +`/{id}`, +`/{id}/messages`),
  `/profile` (GET/PATCH), `/reviews` (+pending).
- **Landlord:** `/landlord/dashboard`, `/properties` (GET/POST, `/{id}` GET/PATCH),
  `/leases` (+`/{id}`), `/tenants` (+`/{id}`), `/maintenance` (+`/{id}` PATCH),
  `/complaints` (+`/{id}` PATCH, +`/{id}/messages`), `/rent` (+`/rent/record`),
  `/applications` (+`/{id}` PATCH), `/visits` (+`/{id}` PATCH), `/reviews` (+pending),
  `/inquiries` (+`/{id}` GET/POST).
- **Admin (MASTER_ADMIN):** `/admin/dashboard`, `/users` (GET/POST, `/{id}` GET/PATCH,
  `/{id}/status`, `/{id}/verify`), `/properties` (GET, `/{id}/approve`), `/leases`,
  `/payments`, `/maintenance`, `/reviews` (GET, `/{id}` PATCH), `/activity`.
- **Seeker / public:** `/listings` (paginated search), `/listings/{idOrRef}`, `/account/enquiries`,
  `/account/applications` (GET + POST `{propertyId,message?}` — apply to rent),
  `/account/visits` (GET + POST `{propertyId,preferredAt,message?}` — book a tour).
- **Landlord add-tenant:** `POST /landlord/tenants` `{fullName,email,password,phone?,governmentId?}`.
- **Shared:** `/notifications` (GET), `/notifications/read` (POST).
- **Reused (now Bearer-enabled):** `/api/otp/send`, `/api/otp/verify` (purposes: chat/register/reset),
  `/api/inquiries`, `/api/messages`, `/api/upload`, `/api/files/{id}`.

## 4. Verify the backend is live

```
curl -s -o /dev/null -w "landlord: %{http_code}\n" https://prebuildapps.com/api/mobile/v1/landlord/dashboard
curl -s -o /dev/null -w "admin:    %{http_code}\n" https://prebuildapps.com/api/mobile/v1/admin/dashboard
```
**401 = good** (endpoint exists, just needs a token). 404 = backend not updated yet.

## 5. Test logins (live)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@prebuildapps.com` | `Password123!` |
| Landlord | `landlord@prebuildapps.com` | `Password123!` |
| Tenant | `tenant@prebuildapps.com` | `Password123!` |
| Seeker | register a new one in-app | — |

## 6. Things to know

- **Response shapes:** align the app to the JSON in `MOBILE-API.md`. Paths match your branch
  (`landlord/*`, `admin/*`); if a field name differs, adjust the app to the documented shape.
  (Do **not** deploy a second backend branch — the live backend already covers all 4 portals.)
- **`/listings`** returns `totalPages` for pagination.
- **In-app payments (Razorpay):** not active yet — server `RAZORPAY_*` keys are blank.
- **Push notifications:** Android **FCM** is not wired up (needs a Firebase project).
- **Live data is sparse right now:** the DB has the 3 test accounts but few/no properties &
  leases. Create some via the web admin/landlord (or the new endpoints) so list screens show data.

---

## Hosting facts (why the old Docker/VPS steps don't apply)

- Host: **cPanel** (`s3122.usc1.stableserver.net`), **Phusion Passenger**, Node 20, app root
  `/home/triplemi/leaselord`, startup `server.js`.
- Database: **MySQL** (`triplemi_leaselord`) — not Postgres.
- **No Docker, no docker-compose, no git repo on the server.** Deploys are a tarball upload +
  Passenger restart, done by the site owner. You only need the app side.
