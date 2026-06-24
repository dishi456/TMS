# Backend deploy — 3 new mobile endpoints

Adds **Add tenant**, **Seeker apply**, and **Seeker book-a-visit** to the live
mobile API (`prebuildapps.com`). The app already calls these; they return 404/405
until you deploy.

- **No schema changes, no migration.** Uses tables you already have
  (`User`, `Property`, `Application`, `Visit`).
- Uses the **same helpers your existing mobile endpoints use** — `requireMobileUser`,
  `json`, `error` (from `@/lib/mobile-auth`), `prisma`, `notify`, `audit`, plus
  `bcryptjs`, `zod`, `@prisma/client`. If any import path differs in your project,
  adjust the import line only — the logic is unchanged.
- Same Bearer-JWT auth as the rest of the mobile API.

Three files. **#1 = edit existing, #2 and #3 = new files.**

---

## 1) Add tenant — EDIT `src/app/api/mobile/v1/landlord/tenants/route.ts`

**Two changes here:** (a) REPLACE the existing `GET` so newly-added tenants show
up (your current GET only finds tenants that already have a lease — added tenants
have none yet, so they were invisible), and (b) add the `POST` handler.

**Replace your `GET` with this** (queries by `landlordId`):

```ts
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["LANDLORD"]);
  if (user instanceof Response) return user;
  const tenants = await prisma.user.findMany({
    where: { role: "TENANT", landlordId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, fullName: true, email: true, phone: true, status: true, verified: true },
  });
  return json({ tenants });
}
```

Then add the `POST` (mirrors the website's `addTenant`):

Add these imports at the top (merge with what's already there):

```ts
import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { audit } from "@/lib/audit";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";
// (prisma is already imported in this file)
```

Append this handler to the file:

```ts
// POST /api/mobile/v1/landlord/tenants → landlord adds a tenant.
const addSchema = z.object({
  fullName: z.string().min(2, "Enter the tenant's full name."),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  phone: z.string().trim().optional(),
  governmentId: z.string().trim().optional(),
});

export async function POST(req: Request) {
  const user = await requireMobileUser(req, ["LANDLORD"]);
  if (user instanceof Response) return user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body.");
  }
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return error(parsed.error.issues[0].message);
  const d = parsed.data;

  try {
    const tenant = await prisma.user.create({
      data: {
        fullName: d.fullName,
        email: d.email.toLowerCase(),
        passwordHash: await bcrypt.hash(d.password, 10),
        role: "TENANT",
        status: "ACTIVE",
        landlordId: user.id,
        phone: d.phone && d.phone.length > 0 ? d.phone : null,
        governmentId: d.governmentId && d.governmentId.length > 0 ? d.governmentId : null,
      },
      select: { id: true },
    });
    await audit({ actorId: user.id, action: "tenant.add", entity: "User", entityId: tenant.id });
    return json({ ok: true, id: tenant.id });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return error("A user with this email already exists.", 409);
    }
    throw e;
  }
}
```

---

## 2) Seeker apply — NEW FILE `src/app/api/mobile/v1/account/applications/route.ts`

```ts
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET → the signed-in seeker's applications.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["USER", "TENANT"]);
  if (user instanceof Response) return user;

  const apps = await prisma.application.findMany({
    where: { email: user.email.toLowerCase() },
    orderBy: { createdAt: "desc" },
    include: { property: { select: { name: true, ref: true } } },
  });

  return json({
    items: apps.map((a) => ({
      id: a.id,
      status: a.status,
      message: a.message,
      createdAt: a.createdAt,
      property: a.property.name,
      ref: a.property.ref,
    })),
  });
}

// POST { propertyId, message? } → apply to rent. Mirrors web submitApplication.
const schema = z.object({
  propertyId: z.string().min(1, "Missing property."),
  message: z.string().trim().optional(),
});

export async function POST(req: Request) {
  const user = await requireMobileUser(req, ["USER", "TENANT"]);
  if (user instanceof Response) return user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return error(parsed.error.issues[0].message);
  const d = parsed.data;

  const property = await prisma.property.findFirst({
    where: { id: d.propertyId, approved: true },
    select: { id: true, name: true, landlordId: true },
  });
  if (!property) return error("This property is not available for applications.", 404);

  const existing = await prisma.application.findFirst({
    where: { propertyId: property.id, email: user.email.toLowerCase(), status: "PENDING" },
    select: { id: true },
  });
  if (existing) return error("You've already applied to this property.", 409);

  const app = await prisma.application.create({
    data: {
      propertyId: property.id,
      fullName: user.fullName,
      email: user.email.toLowerCase(),
      phone: user.phone || null,
      message: d.message || null,
      status: "PENDING",
    },
    select: { id: true },
  });

  await notify(property.landlordId, {
    type: "application",
    title: "New rental application",
    body: `${user.fullName} applied for ${property.name}.`,
    link: "/landlord/applications",
  });
  const admins = await prisma.user.findMany({ where: { role: "MASTER_ADMIN" }, select: { id: true } });
  for (const a of admins) {
    await notify(a.id, { type: "application", title: "New rental application", body: `${user.fullName} applied for ${property.name}.` });
  }

  return json({ ok: true, id: app.id });
}
```

---

## 3) Seeker book-a-visit — NEW FILE `src/app/api/mobile/v1/account/visits/route.ts`

```ts
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { requireMobileUser, json, error } from "@/lib/mobile-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET → the signed-in seeker's visit requests.
export async function GET(req: Request) {
  const user = await requireMobileUser(req, ["USER", "TENANT"]);
  if (user instanceof Response) return user;

  const visits = await prisma.visit.findMany({
    where: { email: user.email.toLowerCase() },
    orderBy: { createdAt: "desc" },
    include: { property: { select: { name: true, ref: true } } },
  });

  return json({
    items: visits.map((v) => ({
      id: v.id,
      status: v.status,
      preferredAt: v.preferredAt,
      message: v.message,
      createdAt: v.createdAt,
      property: v.property.name,
      ref: v.property.ref,
    })),
  });
}

// POST { propertyId, preferredAt(ISO), message? } → book a tour. Mirrors requestVisit.
const schema = z.object({
  propertyId: z.string().min(1, "Missing property."),
  preferredAt: z.string().min(1, "Pick a preferred date & time."),
  message: z.string().trim().optional(),
});

export async function POST(req: Request) {
  const user = await requireMobileUser(req, ["USER", "TENANT"]);
  if (user instanceof Response) return user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return error("Invalid JSON body.");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return error(parsed.error.issues[0].message);
  const d = parsed.data;

  const when = new Date(d.preferredAt);
  if (Number.isNaN(when.getTime())) return error("Invalid date & time.");
  if (when.getTime() < Date.now()) return error("Pick a future date & time.");

  const property = await prisma.property.findFirst({
    where: { id: d.propertyId, approved: true },
    select: { id: true, name: true, landlordId: true },
  });
  if (!property) return error("This property is not available for visits.", 404);

  const visit = await prisma.visit.create({
    data: {
      propertyId: property.id,
      fullName: user.fullName,
      email: user.email.toLowerCase(),
      phone: user.phone || null,
      preferredAt: when,
      message: d.message || null,
      status: "PENDING",
    },
    select: { id: true },
  });

  const whenStr = when.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  await notify(property.landlordId, {
    type: "visit",
    title: "New visit request",
    body: `${user.fullName} wants to tour ${property.name} on ${whenStr}.`,
    link: "/landlord/visits",
  });
  const admins = await prisma.user.findMany({ where: { role: "MASTER_ADMIN" }, select: { id: true } });
  for (const a of admins) {
    await notify(a.id, { type: "visit", title: "New visit request", body: `${user.fullName} requested a tour of ${property.name}.` });
  }

  return json({ ok: true, id: visit.id });
}
```

---

## Deploy

1. Add the code above into the three files in your live backend source.
2. Build & upload your tarball, restart Passenger (your normal flow).

## Verify (after deploy)

Get tokens, then check the endpoints answer **validation errors (400)**, not 404/405:

```bash
B=https://prebuildapps.com/api/mobile/v1
LTOK=$(curl -s -X POST "$B/auth/login" -H 'Content-Type: application/json' -d '{"email":"landlord@prebuildapps.com","password":"Password123!"}' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

# add-tenant: expect 400 "Enter the tenant's full name." (NOT 405)
curl -s -X POST -H "Authorization: Bearer $LTOK" -H 'Content-Type: application/json' -d '{}' "$B/landlord/tenants"

# apply / visit (use a USER token): expect 400 validation (NOT 404)
# curl -s -X POST -H "Authorization: Bearer <USER_JWT>" -H 'Content-Type: application/json' -d '{}' "$B/account/applications"
# curl -s -X POST -H "Authorization: Bearer <USER_JWT>" -H 'Content-Type: application/json' -d '{}' "$B/account/visits"
```

## No change needed
- **Property photo upload** already works via the existing `/api/upload`
  (`purpose=property-photo`, `refId=<propertyId>`, Bearer) — verified live.

## Once deployed, in the app
- **Add tenant** → Landlord → Tenants → ＋ Add tenant.
- **Apply / Book a visit** → Seeker → listing detail → "Interested?".
- New applications/visits land in the landlord's **Tenant requests** / **Visit requests**.
