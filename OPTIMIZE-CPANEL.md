# Fix: Node app hitting cPanel's 100-process limit

Your Next.js app isn't "leaking" — it's that **Prisma + Node spawn lots of
threads**, and cPanel counts threads (and any stray/duplicate Node instances)
toward the 100-process cap. Biggest offender: **Prisma's connection pool**, which
by default opens `CPU cores × 2 + 1` DB connections — on a shared box reporting
many cores that's dozens of threads.

Apply these 4 changes (in order of impact). No app logic changes.

---

## 1. Cap the Prisma connection pool ← biggest win
Append to your **`DATABASE_URL`** in the server's `.env` (or cPanel → Node app →
Environment variables):

```
?connection_limit=3&pool_timeout=20
```

Example:
```
DATABASE_URL="mysql://triplemi_user:PASS@localhost:3306/triplemi_leaselord?connection_limit=3&pool_timeout=20"
```
This alone typically drops the thread/process count dramatically.

## 2. Add resource-limit env vars
In the same place (`.env` / cPanel env vars):
```
NODE_ENV=production
UV_THREADPOOL_SIZE=2
```
- `NODE_ENV=production` → Next runs in optimized mode (fewer dev threads/logs).
- `UV_THREADPOOL_SIZE=2` → caps Node's libuv worker threads (default 4).

## 3. Keep Passenger to one instance
Add these lines to the app's **existing `.htaccess`** (do NOT replace the file —
just append; keep cPanel's auto-generated `PassengerAppRoot`/`PassengerStartupFile` lines):
```apache
PassengerMinInstances 1
PassengerMaxRequests 2000
PassengerMaxRequestQueueSize 50
```
- `PassengerMinInstances 1` → don't pre-spawn extra copies.
- `PassengerMaxRequests 2000` → recycle the worker every 2000 requests so threads/memory never pile up.

## 4. Deploy the Prisma singleton fix + restart cleanly
- The updated `src/lib/prisma.ts` (in the repo) now caches the client on
  `globalThis` in **all** environments, so even an accidental re-import can't
  start a second query engine. Deploy it (it's in the latest backend build).
- Then **kill stray processes and restart**:

```bash
# from the cPanel Terminal (or SSH):
# 1) see what's running under your account
ps -u $(whoami) -o pid,ppid,rss,cmd --sort=-rss | grep -iE "node|next|prisma" | grep -v grep

# 2) kill leftovers from testing/deploys (next dev, prisma studio, old builds)
pkill -u $(whoami) -f "next dev"      2>/dev/null
pkill -u $(whoami) -f "prisma studio" 2>/dev/null

# 3) restart the app cleanly (cPanel → Node.js App → Restart, or):
touch tmp/restart.txt
```

> Don't run `npm run dev`, `prisma studio`, or `npm run build` and leave them
> open on the server — each spawns many worker processes. Build once, then stop it.

---

## Verify
After the restart, watch the count in cPanel (or):
```bash
ps -u $(whoami) -o pid,cmd | grep -iE "node|next" | grep -v grep | wc -l
```
It should now be a small, steady number (a few), not 100.

## Why this happens (summary)
| Cause | Fix |
|---|---|
| Prisma opens CPU×2+1 DB connections (threads) | `connection_limit=3` on DATABASE_URL |
| libuv default 4 worker threads | `UV_THREADPOOL_SIZE=2` |
| Passenger pre-spawning / never recycling | `.htaccess` PassengerMinInstances + MaxRequests |
| Stray `next dev` / `prisma studio` / build processes | kill them; build once then stop |
| Accidental 2nd PrismaClient | singleton cached on globalThis (code fix) |
