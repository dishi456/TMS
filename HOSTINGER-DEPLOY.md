# Lease Lord (TMS) — Deploy to Hostinger (Shared / Cloud, hPanel Node.js App)

The app uses **MySQL**, which Hostinger provides on Shared and Cloud plans — so
everything (app + database) lives on Hostinger; no external database needed.

The app runs as a **Node.js App** under Phusion Passenger. You upload the source,
let the server run `npm install` + `npm run build` (this also fetches the correct
Linux Prisma engine), and Passenger runs `server.js`.

---

## Step 1 — Create the MySQL database in hPanel

1. hPanel → **Databases → MySQL Databases**.
2. Create a new database and a database user, and assign the user to the database.
   Hostinger prefixes both, e.g. database `u123456789_tms`, user `u123456789_tms`.
3. Note the **database name, username, password**. The host is normally `localhost`
   for an app running on the same hosting account.

---

## Step 2 — Create the Node.js App in hPanel

1. hPanel → **Websites** → **Add Website** → **Node.js Apps** (or **Hosting → Node.js**).
2. Set:
   - **Node version:** 20 (or newer)
   - **Application root:** e.g. `domains/your-domain.com/app`
   - **Application startup file:** `server.js`
   - **Application URL:** your domain
3. Create the app.

---

## Step 3 — Upload the code

1. Upload **`lease-lord-hostinger.zip`** via hPanel **File Manager** into the
   application root, then **Extract** it there.
   (Do *not* upload `node_modules` or `.next` — they're built on the server.)
2. Confirm `package.json` and `server.js` sit directly in the application root.

---

## Step 4 — Set environment variables

In the Node.js App settings, add the variables from **`.env.hostinger.example`**
(or create a `.env` file in the app root). At minimum set:

- `DATABASE_URL` → `mysql://DBUSER:DBPASSWORD@localhost:3306/DBNAME` (from Step 1)
- `NEXT_PUBLIC_APP_URL` → `https://your-domain.com`  ← **must be set before the build**
- `VAPID_SUBJECT` → `mailto:admin@your-domain.com`
- `NODE_ENV` → `production`

`AUTH_SECRET`, `CRON_SECRET`, and the VAPID/Gmail values are pre-filled in the example.

---

## Step 5 — Install, generate, migrate, build (on the server)

Open the app's **terminal** in hPanel (or SSH) — make sure you're in the application
root — and run, in order:

```bash
npm install                 # installs deps + the Linux-native Prisma engine & bcrypt
npx prisma generate         # generate the client for THIS server's platform
npx prisma db push          # create all tables in your MySQL database
npm run db:seed             # OPTIONAL: demo users (see README for logins)
npm run build               # production build (NEXT_PUBLIC_* are baked in here)
mkdir -p storage            # uploads are stored here (persists on Hostinger disk)
```

If `npm run build` runs out of memory on a small plan, build locally with the same
Node version and upload the resulting `.next` folder too — but you must still run
`npm install` + `npx prisma generate` on the server so the Prisma engine matches.

---

## Step 6 — Start & enable HTTPS

1. In the Node.js App page click **Restart** (Passenger runs `server.js`).
2. In hPanel, enable the free **SSL certificate** for the domain and force HTTPS.
3. Visit `https://your-domain.com` — the app should load. PWA install + Web Push
   only work over HTTPS.

---

## Step 7 — Scheduled rent automation (hPanel Cron Jobs)

hPanel → **Advanced → Cron Jobs** → add a daily job:

```bash
curl -fsS -X POST https://your-domain.com/api/cron/run \
  -H "Authorization: Bearer YOUR_CRON_SECRET" >/dev/null 2>&1
```

Invoice generation is idempotent, so running it more than once a day is safe.

---

## Verify

- [ ] `https://your-domain.com` loads with a valid certificate
- [ ] Log in (demo creds in `README.md`, or a real account)
- [ ] Create a property/lease — confirms the MySQL connection
- [ ] Password-reset email sends — confirms Gmail SMTP
- [ ] Enable notifications — confirms VAPID / Web Push
- [ ] Upload a document; it persists after an app restart

## Troubleshooting

- **502 / app won't start:** check the Node.js App logs. Usually a missing env var
  or `server.js` not set as the startup file.
- **`PrismaClientInitializationError` about the query engine:** you uploaded a
  Windows-built `node_modules`/client. Delete `node_modules` and `.prisma`, then
  re-run `npm install` + `npx prisma generate` **on the server**.
- **Auth/CSRF errors:** ensure `NEXT_PUBLIC_APP_URL` matches the real HTTPS domain
  and `AUTH_TRUST_HOST=true` is set, then rebuild.
- **`Access denied` / can't connect to DB:** double-check the db name/user/password
  (Hostinger prefixes them) and that the user is assigned to the database.
