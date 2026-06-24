# Lease Lord — Mobile API Specification (Android: Tenant & User)

Audience: the mobile developer. This document describes (A) what REST API exists
today, (B) why a dedicated mobile API is needed, and (C) the full endpoint spec to
build for the **Tenant** and **User (property seeker)** Android apps.

Base URL: `https://prebuildapps.com`

---

## ✅ IMPLEMENTATION STATUS (built & tested)

The mobile REST API described below has now been **implemented** in the codebase
under **`/api/mobile/v1/*`** with **Bearer-JWT auth**, and **tested end-to-end**
against the database (login, register-via-OTP, all tenant reads/writes, public
listings). Deploy the latest build to make it live.

**Implemented & verified (all 4 roles):**
- Auth: `POST /api/mobile/v1/auth/login`, `/auth/register`, `/auth/forgot`, `/auth/reset`, `GET /api/mobile/v1/me`
- Tenant: `/tenant/dashboard`, `/tenant/lease`, `/tenant/lease/notice`, `/tenant/invoices`, `/tenant/payments`, `/tenant/maintenance` (GET+POST), `/tenant/maintenance/{id}`, `/tenant/complaints` (GET+POST), `/tenant/complaints/{id}`, `/tenant/complaints/{id}/messages`, `/tenant/profile` (GET+PATCH), `/tenant/reviews` (GET+POST), `/tenant/reviews/pending`
- **Landlord:** `/landlord/dashboard`, `/landlord/properties` (GET+POST), `/landlord/properties/{id}` (GET+PATCH), `/landlord/leases` (+`/{id}`), `/landlord/tenants` (GET list + **POST add-tenant** `{fullName,email,password,phone?,governmentId?}`, +`/{id}`), `/landlord/maintenance` (+`/{id}` GET+PATCH), `/landlord/complaints` (+`/{id}` GET+PATCH, `/{id}/messages` POST), `/landlord/rent` (+`/rent/record` POST), `/landlord/applications` (+`/{id}` PATCH), `/landlord/visits` (+`/{id}` PATCH), `/landlord/reviews` (GET+POST), `/landlord/reviews/pending`, `/landlord/inquiries` (+`/{id}` GET+POST)
- **Admin (MASTER_ADMIN):** `/admin/dashboard`, `/admin/users` (GET+POST), `/admin/users/{id}` (GET+PATCH), `/admin/users/{id}/status` (POST), `/admin/users/{id}/verify` (POST), `/admin/properties` (GET), `/admin/properties/{id}/approve` (POST), `/admin/leases`, `/admin/payments`, `/admin/maintenance`, `/admin/reviews` (GET), `/admin/reviews/{id}` (PATCH), `/admin/activity`
- Shared: `/notifications` (GET), `/notifications/read` (POST)
- Seeker: `/listings` (GET, paginated search), `/listings/{idOrRef}`, `/account/enquiries`, `/account/applications` (GET + **POST** `{propertyId,message?}` apply-to-rent), `/account/visits` (GET + **POST** `{propertyId,preferredAt,message?}` book-a-tour) — both accept USER or TENANT, return `{items}` on GET and `{ok,id}` on POST
- Reused (now Bearer-enabled): `/api/otp/send`, `/api/otp/verify` (purposes chat/register/reset), `/api/inquiries`, `/api/inquiries/{token}`, `/api/messages`, `/api/upload`, `/api/files/{id}`, `/api/payments/razorpay/*`

**Not implemented (intentional / needs external setup):**
- **Push** — Android needs **FCM** (Firebase). The web Web-Push isn't usable by native; add an FCM token endpoint + Firebase Admin (see §F). Requires a Firebase project.
- **Saved/Wishlist** — keep device-local in the app + use `/api/listings/summary?ids=`, or build a server table later.
- **Payments** — endpoints exist but Razorpay keys (`RAZORPAY_*`) are still blank; set them to enable in-app payment.

> The spec below documents the full surface; treat the lists above as the source
> of truth for what is live in code.

---

## A. IMPORTANT: current architecture

The web app is **Next.js (App Router)**. Almost every action (create lease,
submit maintenance, pay rent, file a complaint, update profile, rate, etc.) is a
**Server Action** — server-side functions invoked by the web UI over an internal
RPC protocol. **These are NOT REST endpoints and cannot be called from a native
Android app.**

Authentication is **Auth.js / NextAuth v5** with a **JWT stored in an httpOnly
session cookie** (email + bcrypt password login). This cookie model is awkward for
native apps.

**Conclusion:** the backend logic (Prisma models, validation, email/OTP, storage,
Razorpay, notifications) all exists and is reusable, but it must be **exposed as a
proper token-authenticated REST API** for the apps. Recommended namespace for all
new endpoints: **`/api/mobile/v1/...`**. Reuse existing helper libs: `@/lib/prisma`,
`@/lib/otp`, `@/lib/notify`, `@/lib/storage`, `@/lib/razorpay`, `bcryptjs`.

Legend: **[EXISTS]** = already implemented & reusable · **[BUILD]** = needs to be created.

---

## B. Existing REST endpoints (reusable)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/otp/send` | none | Send a 6-digit email OTP. Body `{ email, purpose: "chat"\|"register" }`. **[EXISTS]** |
| POST | `/api/otp/verify` | none | Verify OTP → `{ ok, verifyToken }`. Body `{ email, code, purpose }`. **[EXISTS]** |
| POST | `/api/inquiries` | optional | Start a chat with a property owner. Body `{ propertyId, name, phone, email, message, otpToken }` (guests need `otpToken` from OTP; logged-in users skip it) → `{ token }`. **[EXISTS]** |
| GET | `/api/inquiries/{token}` | none (token) | Fetch an inquiry thread by its token. **[EXISTS]** |
| GET/POST | `/api/messages` | cookie | Landlord↔tenant 1:1 chat. GET `?with={userId}` → `{ messages, online }`; POST `{ recipientId, body }`. **[EXISTS — but cookie auth; needs Bearer support for mobile]** |
| GET | `/api/listings/summary?ids=a,b,c` | none | Public property cards for given ids (used by Saved list). **[EXISTS]** |
| POST/DELETE | `/api/push/subscribe` | cookie | Web Push (VAPID) subscription. **Browser-only — Android uses FCM instead (see §F).** |
| POST | `/api/upload` | cookie | Multipart file upload → `{ id, url }`. Field `file`, `purpose`, `refId`. **[EXISTS — needs Bearer support]** |
| GET | `/api/files/{id}` | varies | Serve/download a stored file (images, docs). **[EXISTS]** |
| POST | `/api/payments/razorpay/order` | cookie | Create a Razorpay order for an invoice. **[EXISTS — needs Razorpay keys configured + Bearer support]** |
| POST | `/api/payments/razorpay/verify` | cookie | Verify a Razorpay payment signature. **[EXISTS — same]** |
| GET/POST | `/api/auth/[...nextauth]` | — | NextAuth web handlers (cookie login/session/csrf/signout). Not suitable for native. |

Everything a Tenant/User app needs beyond the above (lease, invoices, maintenance,
complaints, notifications, profile, reviews, listings browse, saved, account) is
currently **Server Actions** and must be built as REST — see §D and §E.

---

## C. Authentication for mobile  **[BUILD]**

Use **token (Bearer JWT)** auth instead of cookies. Sign tokens with the existing
`AUTH_SECRET`; the app stores the token and sends `Authorization: Bearer <token>`
on every request.

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/mobile/v1/auth/login` | `{ email, password }` | `{ token, user: { id, fullName, email, role, status } }` — bcrypt-check, reject SUSPENDED, sign 30-day JWT. |
| POST | `/api/mobile/v1/auth/register` | `{ fullName, email, password, role: "USER"\|"LANDLORD", otpToken }` | `{ token, user }` — OTP-gated (uses `/api/otp/send`+`/verify`, purpose `register`). |
| GET | `/api/mobile/v1/me` | — (Bearer) | `{ id, fullName, email, role, phone, avatarUrl, verified, status }` |
| POST | `/api/mobile/v1/auth/forgot` | `{ email }` | `{ ok: true }` — emails a reset code/link. |
| POST | `/api/mobile/v1/auth/reset` | `{ email, code, newPassword }` | `{ ok: true }` |

Tenants are created by a landlord/admin (not self-signup). The app should support
the **email-OTP login** option too if `AUTH_LOGIN_OTP=on` (then login also requires
an OTP step).

Logout = the app discards the token (optionally a `/auth/logout` to revoke).

---

## D. TENANT app endpoints  **[BUILD]** (all require Bearer, role TENANT)

### Dashboard
- `GET /api/mobile/v1/tenant/dashboard` → summary: active lease, next due invoice, open maintenance count, unread notifications.

### Lease
- `GET /api/mobile/v1/tenant/lease` → active lease `{ id, property{name,address,photos}, landlord{name,phone}, monthlyRent, securityDeposit, startDate, endDate, status, noticePeriodDays, signedContractUrl }`.
- `POST /api/mobile/v1/tenant/lease/notice` → give notice to vacate `{ effectiveDate? }`.

### Rent / Payments
- `GET /api/mobile/v1/tenant/invoices` → list `{ id, periodMonth, amount, dueDate, status }`.
- `GET /api/mobile/v1/tenant/payments` → payment history.
- `GET /api/mobile/v1/tenant/payments/{id}/receipt` → receipt data (or PDF url).
- `POST /api/payments/razorpay/order` `{ invoiceId }` → `{ orderId, amount, key }` **[EXISTS]** — use with the **Razorpay Android SDK**.
- `POST /api/payments/razorpay/verify` `{ orderId, paymentId, signature, invoiceId }` → marks paid **[EXISTS]**.

### Maintenance
- `GET /api/mobile/v1/tenant/maintenance` → list `{ id, title, status, priority, images[], createdAt }`.
- `GET /api/mobile/v1/tenant/maintenance/{id}` → detail.
- `POST /api/mobile/v1/tenant/maintenance` `{ title, description, priority, imageUrls[] }` → create. (Upload images first via `/api/upload` purpose `maintenance-image`.)

### Complaints
- `GET /api/mobile/v1/tenant/complaints` → list `{ id, subject, status, createdAt }`.
- `GET /api/mobile/v1/tenant/complaints/{id}` → detail + messages.
- `POST /api/mobile/v1/tenant/complaints` `{ subject, description, propertyId? }`.
- `POST /api/mobile/v1/tenant/complaints/{id}/messages` `{ body }`.

### Messages (chat with landlord)
- `GET /api/messages?with={landlordId}` and `POST /api/messages` **[EXISTS — add Bearer auth]**. Poll for new messages.

### Notifications
- `GET /api/mobile/v1/notifications` → `{ id, type, title, body, link, read, createdAt }[]`.
- `POST /api/mobile/v1/notifications/read` `{ id? }` → mark one/all read.

### Profile
- `GET /api/mobile/v1/tenant/profile` → full profile.
- `PATCH /api/mobile/v1/tenant/profile` `{ fullName?, phone?, emergencyContact?, avatarUrl? }`.
- Document/photo upload via `/api/upload` (purposes `profile-id`, `profile-other`, `verification-aadhaar`, `verification-photo`).

### Reviews (two-way ratings)
- `GET /api/mobile/v1/tenant/reviews/pending` → leases the tenant may rate (lease ended).
- `POST /api/mobile/v1/tenant/reviews` `{ leaseId, stars, criteria{...}, feedback?, recommend }`.
- `GET /api/mobile/v1/tenant/reviews` → given + received.

---

## E. USER (property seeker) app endpoints  **[BUILD]**

Public browsing needs no auth; saving/inquiring/profile needs Bearer (role USER).

### Listings (public)
- `GET /api/mobile/v1/listings` with query: `q, city, type, minRent, maxRent, bedrooms, furnishing, amenities, sort, page, pageSize` → paginated cards `{ items[], total, page }`.
- `GET /api/mobile/v1/listings/{id}` → full detail `{ ...property, photos[], amenities[], landlord{name, verified} }`.
- `GET /api/listings/summary?ids=...` **[EXISTS]** — for the saved list.

### Saved / Wishlist
> Web stores saved ids in the browser (localStorage). For the app, build server-side:
- `GET /api/mobile/v1/saved` → saved properties.
- `POST /api/mobile/v1/saved` `{ propertyId }` / `DELETE /api/mobile/v1/saved/{propertyId}`.
- (Or keep it device-local and just call `/api/listings/summary` — your choice.)

### Inquiries (chat with owner about a listing)
- `POST /api/inquiries` **[EXISTS]** — logged-in users skip OTP; guests verify email first via `/api/otp/send`+`/verify`.
- `GET /api/inquiries/{token}` **[EXISTS]** — load thread.
- `POST /api/mobile/v1/inquiries/{token}/messages` `{ body }` → reply **[BUILD if not present]**.
- `GET /api/mobile/v1/account/enquiries` → the user's inquiries list.

### Account
- `GET /api/mobile/v1/me` / `PATCH /api/mobile/v1/account/profile`.

---

## F. Push notifications (Android)

The web app uses **Web Push (VAPID)** — that's browser-only. For Android use
**Firebase Cloud Messaging (FCM)**:
- `POST /api/mobile/v1/push/register` `{ fcmToken, platform: "android" }` → store token per user.
- Server: send via FCM (add Firebase Admin SDK + `FCM_SERVER_KEY`) wherever the app currently calls `notify()`.

---

## G. Payments

Razorpay order/verify endpoints exist. To use them: configure `RAZORPAY_KEY_ID`,
`RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID` (currently blank), then use the
**Razorpay Android SDK** with the `orderId` returned by `/api/payments/razorpay/order`.

---

## H. Conventions for the developer

- **Auth:** `Authorization: Bearer <jwt>` on all non-public endpoints. 401 if missing/invalid, 403 if wrong role.
- **Responses:** JSON. Errors `{ error: "message" }` with proper HTTP status.
- **Money:** `Decimal` fields are returned as numbers (rupees).
- **Dates:** ISO 8601 strings (UTC).
- **Files/images:** reference `/api/files/{id}`; uploads via multipart `POST /api/upload`.
- **Pagination:** `page` + `pageSize`, return `total`.
- Build everything under `/api/mobile/v1/`; reuse existing Prisma models + `lib/*`.

## I. Effort note

The data model and business logic already exist — this is mostly **wrapping existing
Prisma queries/`lib` functions in REST handlers + adding Bearer-token auth and an FCM
sender.** No schema changes needed. A developer familiar with Next.js route handlers
can implement the Tenant + User surface in a few days.
