# Nexus Suite — Public API v1

> Fully free and unlimited on self-hosted installs (PRD §4.5 v2.1). Rate limits apply only to managed-hosting tier.

## Authentication

All `/api/v1/*` endpoints require a Bearer token:

```bash
curl -H "Authorization: Bearer nexus_<your-key>" https://nexus.yourdomain.com/api/v1/me
```

Create keys in **Settings → API Keys & Webhooks**. Keys are shown once at creation — store them securely.

## Scopes

| Scope | Grants |
|---|---|
| `read` | GET endpoints |
| `write` | POST/PATCH/DELETE endpoints |
| `webhooks` | Manage webhooks |

## Endpoints

### Identity
- `GET /api/v1/me` — current org + scopes + enabled modules

### Tasks (Module 1)
- `GET /api/v1/tasks?projectId=&status=&assigneeId=&limit=` — list tasks (max 100)
- `POST /api/v1/tasks` — create a task (requires `write` scope)
- `GET /api/v1/projects?status=` — list projects

### Rooms (Module 3)
- `GET /api/v1/rooms` — list active rooms
- `GET /api/v1/bookings?roomId=&from=&to=` — list bookings
- `POST /api/v1/bookings` — create a booking (with automatic conflict check)

### Disabled modules
Endpoints for disabled modules return **403** (not 404) with body:
```json
{ "error": "module_not_enabled", "moduleKey": "tasks", "message": "..." }
```

## Webhooks

Subscribe to events at **Settings → API Keys & Webhooks**. Each delivery includes:

- `X-Nexus-Signature: sha256=<hmac>` — HMAC-SHA256 of the body using your webhook secret
- `X-Nexus-Event: task.created` — the event name
- `X-Nexus-Delivery: <delivery-id>` — idempotency key (dedupe on this)
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

Failed deliveries retry up to 5 times with exponential backoff: 1m, 5m, 25m, 2h, 10h. After 5 failures, the webhook is marked failed (but not auto-disabled — you can re-enable it in settings).

### Events

```
task.created        task.updated        task.deleted
booking.confirmed   booking.cancelled
leave.created       leave.approved      leave.rejected
kra.created         kra.updated
expense.created     budget.upserted
document.created    document.updated
```

Subscribe to all with `*`, or use prefix matching like `task.*`.

## Rate limits

- **Self-hosted:** unlimited.
- **Managed Cloud — Starter:** 100 req/min per org
- **Managed Cloud — Business:** 1,000 req/min per org
- **Managed Cloud — Enterprise:** custom

Rate-limited responses return `429 Too Many Requests` with `Retry-After` header.

## SDKs

Not yet available. The API is plain REST + JSON — use `curl`, `fetch`, or any HTTP client.

## Versioning

The API is versioned via URL (`/api/v1/`). Breaking changes ship under `/api/v2/` with at least 6 months of overlap.
