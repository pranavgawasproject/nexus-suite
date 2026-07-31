# Nexus Suite â Public API v1

> Fully free and unlimited on self-hosted installs (PRD Â§4.5 v2.1). Rate limits apply only to managed-hosting tier.

## Authentication

All `/api/v1/*` endpoints require a Bearer token:

```bash
curl -H "Authorization: Bearer nexus_<your-key>" https://nexus.yourdomain.com/api/v1/me
```

Create keys in **Settings â API Keys & Webhooks**. Keys are shown once at creation â store them securely.

## Scopes

| Scope | Grants |
|---|---|
| `read` | GET endpoints |
| `write` | POST/PATCH/DELETE endpoints |
| `webhooks` | Manage webhooks |

## Endpoints

### Identity
- `GET /api/v1/me` â current org + scopes + enabled modules

### Tasks (Module 1)
- `GET /api/v1/tasks?projectId=&status=&assigneeId=&limit=` â list tasks (max 100)
- `POST /api/v1/tasks` â create a task (requires `write` scope)
- `GET /api/v1/projects?status=` â list projects
- `GET /api/v1/worklogs?taskId=` â list worklogs for a task
- `POST /api/v1/worklogs` â log time against a task (`write`)
- `GET /api/v1/milestones?projectId=&status=&limit=` â list project milestones (max 100)
- `POST /api/v1/milestones` â create a milestone (`write`; requires `projectId`, `name`; emits `milestone.created` webhook)
- `GET /api/v1/cycles?projectId=&status=&limit=` — list cycles/sprints (max 100)
- `POST /api/v1/cycles` — create a cycle (`write`; requires `name`; optional `projectId`, dates, goal; emits `cycle.created` webhook)

### Rooms (Module 3)
- `GET /api/v1/rooms` â list active rooms
- `GET /api/v1/bookings?roomId=&from=&to=` â list bookings
- `POST /api/v1/bookings` â create a booking (with automatic conflict check)

### Resource & Capacity (Module 4)
- `GET /api/v1/allocations?userId=&projectId=&limit=` â list allocations (max 100)
- `POST /api/v1/allocations` â create an allocation (`write`; requires `userId`, `projectId`, `allocationPct`, `startDate`; emits `allocation.created` webhook)

### Leave & Attendance (Module 8)
- `GET /api/v1/leaves?userId=&status=&limit=` â list leave requests (max 100)
- `POST /api/v1/leaves` â submit a leave request (`write`; emits `leave.created` webhook)
- `GET /api/v1/holidays?limit=` â list organization holidays (max 100)
- `POST /api/v1/holidays` â create a holiday (`write`; unique date per org; emits `holiday.created` webhook)
- `GET /api/v1/attendance?userId=&date=&from=&to=&limit=` â list attendance records (max 100)
- `POST /api/v1/attendance` â check-in / check-out (`write`; body: `userId`, `action` = `check_in`|`check_out`, optional `timestamp`; emits `attendance.check_in` / `attendance.check_out`)

### KRA / KPA (Module 2)
- `GET /api/v1/kras?userId=&cycle=&status=&limit=` â list KRAs (max 100)
- `POST /api/v1/kras` â create a KRA (`write`; emits `kra.created` webhook)

### Risk & Issue (Module 6)
- `GET /api/v1/risks?projectId=&status=&category=&limit=` â list risks (max 100)
- `POST /api/v1/risks` â create a risk (`write`; emits `risk.created` webhook)
- `GET /api/v1/issues?projectId=&status=&severity=&limit=` â list issues (max 100)
- `POST /api/v1/issues` â create an issue (`write`; emits `issue.created` webhook)

### Budget & Financial (Module 5)
- `GET /api/v1/budgets?projectId=&limit=` â list project budgets (max 100)
- `POST /api/v1/budgets` â create or upsert budget for a project (`write`; emits `budget.upserted` webhook)
- `GET /api/v1/expenses?projectId=&category=&limit=` â list expenses (max 100)
- `POST /api/v1/expenses` â create an expense (`write`; requires `incurredById`; emits `expense.created` webhook)

### Collaboration & Docs (Module 7)
- `GET /api/v1/documents?parentId=&limit=` â list documents (max 100; `parentId=root` for top-level)
- `POST /api/v1/documents` â create a document (`write`; emits `document.created` webhook; creates initial version snapshot)

### Governance & Compliance (Module 10)
- `GET /api/v1/policies?type=&limit=` â list governance policies (max 100; filter by type)
- `POST /api/v1/policies` â create or upsert policy by type (`write`; one policy per type per org; emits `policy.created` / `policy.updated` webhook)

### Disabled modules
Endpoints for disabled modules return **403** (not 404) with body:
```json
{ "error": "module_not_enabled", "moduleKey": "tasks", "message": "..." }
```

## Webhooks

Subscribe to events at **Settings â API Keys & Webhooks**. Each delivery includes:

- `X-Nexus-Signature: sha256=<hmac>` â HMAC-SHA256 of the body using your webhook secret
- `X-Nexus-Event: task.created` â the event name
- `X-Nexus-Delivery: <delivery-id>` â idempotency key (dedupe on this)
- Body: `{ "event": "task.created", "org_id": "...", "timestamp": "...", "data": {...} }`

### Verifying the signature (Node.js example)

```js
import crypto from 'crypto'

function verifySignature(rawBody, signatureHeader, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected))
}
```

### Retry policy

Failed deliveries retry up to 5 times with exponential backoff: 1m, 5m, 25m, 2h, 10h. After 5 failures, the webhook is marked failed (but not auto-disabled â you can re-enable it in settings).

### Events

```
task.created        task.updated        task.deleted
task.worklog.created
booking.confirmed   booking.cancelled
leave.created       leave.approved      leave.rejected
holiday.created
attendance.check_in attendance.check_out
kra.created         kra.updated
expense.created     budget.upserted
document.created    document.updated
risk.created        issue.created
allocation.created  change_request.created
milestone.created
policy.created      policy.updated
```

Subscribe to all with `*`, or use prefix matching like `task.*`.

## Rate limits

- **Self-hosted:** unlimited.
- **Managed Cloud â Starter:** 100 req/min per org
- **Managed Cloud â Business:** 1,000 req/min per org
- **Managed Cloud â Enterprise:** custom

Rate-limited responses return `429 Too Many Requests` with `Retry-After` header.

## SDKs

Not yet available. The API is plain REST + JSON â use `curl`, `fetch`, or any HTTP client.

## Versioning

The API is versioned via URL (`/api/v1/`). Breaking changes ship under `/api/v2/` with at least 6 months of overlap.
