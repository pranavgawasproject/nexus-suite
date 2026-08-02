---
title: Webhooks
description: Subscribing to and verifying Nexus Suite webhook events.
---

Subscribe to events at **Settings → API Keys & Webhooks**. Each delivery includes:

- `X-Nexus-Signature: sha256=<hmac>` — HMAC-SHA256 of the body using your webhook secret
- `X-Nexus-Event: task.created` — the event name
- `X-Nexus-Delivery: <delivery-id>` — idempotency key (dedupe on this)
- Body: `{ "event": "task.created", "org_id": "...", "timestamp": "...", "data": {...} }`

## Verifying the signature (Node.js)

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

## Retry policy

Failed deliveries retry up to 5 times with exponential backoff: 1m, 5m, 25m, 2h, 10h. After 5 failures, the webhook is marked failed — but not auto-disabled, you can re-enable it in settings.

## Events

```
task.created        task.updated        task.deleted
task.worklog.created
project.created
room.created
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
retrospective.created
task.dependency.created
policy.created      policy.updated
```

Subscribe to all events with `*`, or use prefix matching like `task.*`.
