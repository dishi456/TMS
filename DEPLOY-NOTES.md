# Deployment notes — keeping the cPanel/Passenger process count low

cPanel / CloudLinux counts **every thread and process** under the account against
the `nproc` limit (e.g. 100). A single Next.js + Prisma app can blow past that
because each Node instance spawns a fan of threads. The app code is already
optimized for this (single shared `PrismaClient`, single production server in
`server.js`); the remaining work is **server-side configuration**.

## Where the threads come from

| Source | Threads/processes | Controlled by |
|---|---|---|
| Prisma connection pool | `CPU cores × 2 + 1` (17–33 on a shared box) | `connection_limit` in `DATABASE_URL` |
| libuv thread pool | 4 per Node process | `UV_THREADPOOL_SIZE` |
| V8 background threads | ~6 per Node process | (fixed) |
| Passenger app instances | multiplies all of the above | Passenger pool size |
| Passenger helpers | watchdog + core + router ≈ 3 | (fixed) |
| Stray dev/studio/cron procs | varies | manual cleanup |

The two big multipliers are the **uncapped Prisma pool** and **multiple
Passenger instances**.

## Fixes, in priority order

### 1. Cap the Prisma connection pool (biggest single win)
The production `DATABASE_URL` must end with the pool cap:

```
mysql://USER:PASS@localhost:3306/DB?connection_limit=3&pool_timeout=20
```

Drops ~17 connection threads → 3 per instance. Verify the `.env` *on the server*
uses the MySQL URL **with** `connection_limit` (the local dev `.env` does not need it).

### 2. Force a single Passenger instance
In **hPanel/cPanel → Node.js App**, or via `.htaccess` in the app root:

```apache
PassengerMinInstances 1
PassengerMaxPoolSize 1
```

Stops Passenger from multiplying everything by 4–6 instances.

### 3. Set `UV_THREADPOOL_SIZE=2` as a real process env var
libuv reads this **at process startup**, so it must be set in the cPanel
**Environment variables** UI (Passenger applies it before Node boots). Putting it
only in `.env` is too late — Next loads `.env` after the process has started.

### 4. Kill stray processes
From the app's terminal:

```bash
ps -u $(whoami) -o pid,nlwp,rss,cmd --sort=-nlwp | head -30   # nlwp = thread count
```

Stop anything that isn't the one app: leftover `next dev`, `prisma studio`, or a
`tsx`/cron process. Then restart the app once:

```bash
mkdir -p tmp && touch tmp/restart.txt
```

### 5. Always boot in production
Passenger runs `server.js` with `dev: false` — correct. **Never** run
`npm run dev` (`next dev --webpack`) on the server; its watcher/compiler spawns
many extra processes.

## Expected result

After steps 1–3, a single instance runs at roughly:

```
1 (main) + 2 (libuv) + ~6 (V8) + 3 (Prisma) ≈ 12–15 threads
```

plus Passenger's ~3 helpers — comfortably under 100 with headroom for concurrent
requests.
