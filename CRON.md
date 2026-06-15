# Scheduled automation

A single secured endpoint runs the daily background tasks:

- **Generate monthly invoices** for every active/renewed lease (rent + maintenance fee), idempotent (only creates the current month if missing).
- **Flag overdue** invoices (PENDING past due date → OVERDUE).
- **Send rent reminders** for overdue invoices (in-app notification + email).

## Endpoint

```
GET  /api/cron/run     Authorization: Bearer $CRON_SECRET
POST /api/cron/run     Authorization: Bearer $CRON_SECRET
# or:  /api/cron/run?key=$CRON_SECRET
```

Set `CRON_SECRET` in your environment (see `.env.example`). The endpoint returns a JSON summary:
`{ invoicesCreated, markedOverdue, remindersSent, ranAt }`.

## Scheduling it (run once a day)

**Linux / VPS (cron):**
```cron
0 6 * * *  curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/cron/run >/dev/null
```

**Docker host:** add the same cron line on the host, or a sidecar that curls the app container.

**Vercel (vercel.json):**
```json
{ "crons": [{ "path": "/api/cron/run", "schedule": "0 6 * * *" }] }
```
(Vercel cron calls are authenticated by Vercel; you can also gate with the secret via a header rewrite.)

**Windows (Task Scheduler):**
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/run" -Headers @{ Authorization = "Bearer YOUR_CRON_SECRET" }
```

It's safe to run more often than daily — invoice generation is idempotent.
