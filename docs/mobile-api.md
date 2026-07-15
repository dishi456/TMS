# Lease Lord — Mobile API Reference

Complete reference for the **mobile API** consumed by the Lease Lord app
(`lease-lord-mobile`). All endpoints live under a single versioned prefix.

- **Base URL (prod):** `https://prebuildapps.com`
- **Base URL (local dev):** `http://<PC-LAN-IP>:3100` (or `http://localhost:3100` over an `adb reverse` USB tunnel)
- **API prefix:** `/api/mobile/v1`

So a full URL looks like: `https://prebuildapps.com/api/mobile/v1/me`.

---

## Conventions

### Authentication
- Auth uses a **Bearer JWT**. Obtain it from `POST /auth/login` or `POST /auth/register` (`{ token, user }`).
- Send it on every authenticated request:
  ```
  Authorization: Bearer <token>
  ```
- Roles: `USER` (property seeker), `TENANT`, `LANDLORD`, `MASTER_ADMIN`. Each group below notes the required role. **Public** endpoints need no token.

### Requests & responses
- Request/response bodies are **JSON**; send `Content-Type: application/json`.
- Errors return `{ "error": "message" }` with a non-2xx status (`400` validation, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict, `429` rate-limited).
- Money amounts are plain numbers (displayed with the user's chosen currency symbol client-side).
- IDs are cuids unless noted.

### File uploads & downloads
- Uploads go to `POST /api/upload` (multipart). Protected files are read back from `GET /api/files/{id}?token=<jwt>`.

---

## Auth  *(public)*

| Method | Path | Body / Query | Description |
|---|---|---|---|
| POST | `/auth/login` | `{ email, password, otp? }` | Sign in → `{ token, user }`. Per-account rate limited. |
| POST | `/auth/register` | `{ fullName, email, password, role, otpToken, country?, currency? }` | Self-signup for `USER`/`LANDLORD`. Email must be OTP-verified first (`otpToken`). `country`/`currency` sent for landlords. |
| POST | `/auth/forgot` | `{ email }` | Start password reset. Always returns `{ ok:true }` (no account enumeration). |
| POST | `/auth/reset` | `{ email, code, newPassword }` | Complete password reset with the emailed code. |

### Email OTP  *(public, unversioned)*
| Method | Path | Body | Description |
|---|---|---|---|
| POST | `/api/otp/send` | `{ email, purpose }` | Send a 6-digit code. `purpose` ∈ `register`\|`chat`\|`reset`. Returns `{ ok, devCode? }` (`devCode` only outside production). |
| POST | `/api/otp/verify` | `{ email, code, purpose }` | Verify a code → `{ verifyToken }` to present to the real action. |

---

## Current user & notifications  *(any authenticated role)*

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/me` | — | Current user profile (id, name, email, role, phone, avatar, verified, status, username, currency). |
| GET | `/notifications` | — | The user's notifications + unread count. |
| POST | `/notifications/read` | `{ id? }` | Mark one (`id`) or all notifications read. |

---

## Public listings  *(public — property search)*

| Method | Path | Query | Description |
|---|---|---|---|
| GET | `/listings` | `q, page, pageSize, type, city…` | Paginated public property search. |
| GET | `/listings/{idOrRef}` | — | Full public detail for one property (by id or reference number). |
| GET | `/listings/nearby` | `lat, lng, radius, q` | Approved public properties near a coordinate, sorted by distance. |

---

## Chat  *(party to the lease)*

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/chat/conversations` | — | One conversation per lease the caller is party to (with unread counts). |
| GET | `/chat/{leaseId}` | — | Conversation header + messages; marks incoming as read. |
| POST | `/chat/{leaseId}` | `{ body?, attachmentUrl? }` | Send a message (text and/or an uploaded image attachment). |

---

## Marketplace  *(any authenticated role — second-hand items)*

| Method | Path | Body / Query | Description |
|---|---|---|---|
| GET | `/marketplace/listings` | `q, category, condition, sort, scope` | Browse items (`scope` = all\|mine\|favorites). |
| POST | `/marketplace/listings` | item fields | Create a listing. |
| GET | `/marketplace/listings/{id}` | — | Item detail + seller info. |
| PATCH | `/marketplace/listings/{id}` | item fields | Edit own listing (e.g. mark sold). |
| DELETE | `/marketplace/listings/{id}` | — | Delete own listing. |
| POST | `/marketplace/favorites/{listingId}` | — | Add to wishlist. |
| DELETE | `/marketplace/favorites/{listingId}` | — | Remove from wishlist. |

---

## Seeker (USER) account  *(role: USER)*

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/account/applications` | — | The seeker's rental applications. |
| POST | `/account/applications` | `{ propertyId, … }` | Apply to a property. |
| GET | `/account/enquiries` | — | The seeker's property inquiries. |
| GET | `/account/visits` | — | The seeker's visit/tour requests. |
| POST | `/account/visits` | `{ propertyId, preferredAt, … }` | Request a property visit. |
| PATCH | `/account/profile` | `{ fullName?, phone?, avatarUrl? }` | Update seeker profile. |

---

## Landlord  *(role: LANDLORD)*

### Overview & profile
| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/landlord/dashboard` | — | Full KPI set (collection, dues, occupancy, counts). |
| GET | `/landlord/profile` | — | Landlord identity + portfolio stats + completion %. |
| PATCH | `/landlord/profile` | `{ fullName?, username?, phone?, avatarUrl?, currency?, prefCountry?, prefState?, prefCity? }` | Update profile / unique username / preferences. |

### Properties
| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/landlord/properties` | — | This landlord's properties. |
| POST | `/landlord/properties` | property fields (`name, type, address, rentAmount, details, …`) | Add a property. **Requires a username set first (400 otherwise).** |
| GET | `/landlord/properties/{id}` | — | Full detail (owned). |
| PATCH | `/landlord/properties/{id}` | property fields | Edit a property. |

### Tenants & their documents
| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/landlord/tenants` | — | All tenants this landlord manages. |
| POST | `/landlord/tenants` | `{ fullName, email, password, phone?, governmentId? }` | Create a tenant account. **Requires a username set first (400 otherwise).** |
| GET | `/landlord/tenants/{id}` | — | Tenant profile + full rental history + reviews + blacklist + **their uploaded documents**. |
| PATCH | `/landlord/documents/{id}` | `{ verified }` | Verify / un-verify a tenant's identity document (must share a lease with the owner). |

### Leases
| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/landlord/leases` | — | This landlord's leases. |
| POST | `/landlord/leases` | lease fields (`propertyId, tenantId, monthlyRent, securityDeposit, startDate, endDate, …`) | Create a lease. |
| GET | `/landlord/leases/{id}` | — | Lease detail + invoices. |

### Rent
| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/landlord/rent` | — | Invoices across this landlord's leases. |
| POST | `/landlord/rent/record` | `{ invoiceId, amount, method, reference?, notes?, proofUrl? }` | Record a (possibly partial) payment. |
| POST | `/landlord/rent/mark` | `{ invoiceId, paid }` | Quick mark an invoice paid / unpaid. |
| POST | `/landlord/rent/confirm` | `{ paymentId, approved }` | Confirm/reject a tenant-submitted payment proof. |
| POST | `/landlord/rent/remind` | `{ invoiceId }` | Nudge the tenant about a due invoice. |

### Requests (maintenance, complaints, applications, visits, enquiries)
| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/landlord/maintenance` | — | Maintenance requests across properties. |
| GET / PATCH | `/landlord/maintenance/{id}` | `{ status?, assignedTo? }` | View / update a request. |
| GET | `/landlord/complaints` | — | Complaints from tenants. |
| GET / PATCH | `/landlord/complaints/{id}` | `{ status? }` | Detail + thread / update. |
| POST | `/landlord/complaints/{id}/messages` | `{ body }` | Reply on a complaint. |
| GET | `/landlord/applications` | — | Rental applications for this landlord's properties. |
| PATCH | `/landlord/applications/{id}` | `{ decision }` | Accept / reject an application. |
| GET | `/landlord/visits` | — | Visit/tour requests. |
| PATCH | `/landlord/visits/{id}` | `{ action }` | Confirm / decline a visit (emails the requester). |
| GET | `/landlord/inquiries` | — | Guest/user inquiries. |
| GET / POST | `/landlord/inquiries/{id}` | `{ body }` | Thread / reply. |

### Reviews & blacklist
| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/landlord/reviews/pending` | — | Current + ended leases the landlord can rate the tenant on. |
| GET | `/landlord/reviews` | — | Ratings given + received. |
| POST | `/landlord/reviews` | `{ leaseId, stars, criteria, feedback?, recommend? }` | Rate a tenant (active or ended lease). |
| GET | `/landlord/blacklist` | — | Tenants this landlord has blacklisted. |
| POST | `/landlord/blacklist` | `{ tenantId, reason }` | Blacklist a tenant with a reason. |
| DELETE | `/landlord/blacklist/{tenantId}` | — | Remove from blacklist. |

---

## Tenant  *(role: TENANT)*

| Method | Path | Body | Description |
|---|---|---|---|
| GET | `/tenant/dashboard` | — | At-a-glance summary (next invoice, lease, counts). |
| GET | `/tenant/lease` | — | The tenant's current (active) lease. |
| POST | `/tenant/lease/notice` | `{ leaseId }` | Give notice to vacate. |
| GET | `/tenant/invoices` | — | Rent invoices for the tenant's leases. |
| GET | `/tenant/payments` | — | Payment history. |
| POST | `/tenant/payments/proof` | `{ invoiceId, method, proofUrl }` | Submit a payment proof (method + screenshot) for the landlord to confirm. |
| GET | `/tenant/maintenance` | — | List the tenant's maintenance requests. |
| POST | `/tenant/maintenance` | `{ title, description, priority, images? }` | Raise a maintenance request. |
| GET | `/tenant/maintenance/{id}` | — | One request (owned). |
| GET | `/tenant/complaints` | — | List complaints. |
| POST | `/tenant/complaints` | `{ subject, description }` | Raise a complaint. |
| GET | `/tenant/complaints/{id}` | — | Complaint + message thread. |
| POST | `/tenant/complaints/{id}/messages` | `{ body }` | Reply. |
| GET | `/tenant/documents` | — | The tenant's identity documents. |
| PATCH | `/tenant/documents/{id}` | `{ type?, docNumber?, expiryDate? }` | Update a document's metadata (owned). |
| DELETE | `/tenant/documents/{id}` | — | Delete a document (owned). |
| GET | `/tenant/profile` | — | Profile + preferences + documents + completion %. |
| PATCH | `/tenant/profile` | `{ fullName?, phone?, avatarUrl?, currency?, prefCountry?, prefState?, prefCity? }` | Update profile / preferences. |
| GET | `/tenant/rentals` | — | Full rental history (every lease). |
| GET | `/tenant/reviews/pending` | — | Current + ended leases the tenant can rate. |
| GET | `/tenant/reviews` | — | Ratings the tenant gave and received. |
| POST | `/tenant/reviews` | `{ leaseId, stars, criteria, feedback?, recommend? }` | Rate a landlord (active or ended lease). |

---

## Admin  *(role: MASTER_ADMIN)*

| Method | Path | Body / Query | Description |
|---|---|---|---|
| GET | `/admin/dashboard` | — | Platform overview (full KPI set). |
| GET | `/admin/activity` | — | Recent audit-log entries. |
| GET | `/admin/users` | `role, q` | List users. |
| POST | `/admin/users` | user fields | Create a user. |
| GET / PATCH | `/admin/users/{id}` | user fields | View / edit a user. |
| POST | `/admin/users/{id}/status` | `{ status }` | Activate / suspend / set pending. |
| POST | `/admin/users/{id}/verify` | `{ verified }` | Verify / unverify a user. |
| GET | `/admin/properties` | `status, q` | All properties. |
| POST | `/admin/properties/{id}/approve` | `{ approved }` | Approve / unapprove a property. |
| GET | `/admin/leases` | — | All leases. |
| GET | `/admin/payments` | — | All payments. |
| GET | `/admin/maintenance` | — | All maintenance requests. |
| GET | `/admin/reviews` | `status` | All ratings (moderation queue). |
| PATCH | `/admin/reviews/{id}` | `{ status }` | Moderate a rating (VISIBLE/FLAGGED/REMOVED). |

---

## Files & uploads  *(shared, unversioned)*

| Method | Path | Description |
|---|---|---|
| POST | `/api/upload` | Multipart upload (`file`, `purpose`, `refId`). Bearer-authed. Returns `{ id, url }`. Purposes: `property-photo`, `lease-contract`, `avatar`, `profile-id`, `marketplace-photo`, `payment-proof`, `chat-attachment`. |
| GET | `/api/files/{id}?token=<jwt>` | Read a stored file. **Property photos are public**; sensitive files (leases, government IDs, payment proofs, chat images) are restricted to the owner, admins, and lease parties (a landlord may view their own tenant's ID). |

---

*Generated from the route handlers in `src/app/api/mobile/v1/**` and `src/app/api/{files,upload,otp}/**`.*
