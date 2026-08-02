---
title: Public API v1
description: REST API reference for Nexus Suite.
---

Fully free and unlimited on self-hosted installs. Rate limits apply only to the managed-hosting tier.

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
- `POST /api/v1/tasks` — create a task (`write`)
- `GET /api/v1/projects?status=` — list projects
- `POST /api/v1/projects` — create a project (`write`; requires `name`, `createdById`; optional `description`, `color`, `status`, `startDate`, `endDate`; emits `project.created`)
- `GET /api/v1/cycles?projectId=&status=&limit=` — list cycles/sprints (max 100)
- `POST /api/v1/cycles` — create a cycle (`write`; emits `cycle.created`)
- `GET /api/v1/worklogs?taskId=` — list worklogs for a task
- `POST /api/v1/worklogs` — log time against a task (`write`; requires `authorId`; emits `task.worklog.created`)
- `GET /api/v1/comments?taskId=&limit=` — list comments on a task (max 100)
- `POST /api/v1/comments` — create a comment (`write`; requires `taskId`, `authorId`, `body`; emits `task.comment.created`)
- `GET /api/v1/checklists?taskId=&limit=` — list checklist items (max 100)
- `POST /api/v1/checklists` — create a checklist item (`write`; requires `taskId`, `title`; emits `task.checklist.created`)
- `GET /api/v1/milestones?projectId=&status=&limit=` — list project milestones (max 100)
- `POST /api/v1/milestones` — create a milestone (`write`; requires `projectId`, `name`; emits `milestone.created`)
- `GET /api/v1/retrospectives?cycleId=&status=&limit=` — list sprint retrospectives (max 100)
- `POST /api/v1/retrospectives` — create a retrospective (`write`; requires `cycleId`, `title`; optional `authorId`, `wentWell`, `toImprove`, `actionItems`, `status`; emits `retrospective.created`)
- `GET /api/v1/dependencies?taskId=&limit=` — list task dependencies (max 100)
- `POST /api/v1/dependencies` — create a dependency (`write`; requires `fromTaskId`, `toTaskId`; optional `type` = `blocks`|`relates`; emits `task.dependency.created`)

### Rooms (Module 3)
- `GET /api/v1/rooms` — list active rooms
- `POST /api/v1/rooms` — create a room (`write`; requires `name`; optional `location`, `capacity` (default 4), `amenities`, `active`; emits `room.created`)
- `PATCH /api/v1/rooms` — update a room (`write`; requires `id`; emits `room.updated`)
- `GET /api/v1/bookings?roomId=&from=&to=` — list bookings
- `POST /api/v1/bookings` — create a booking (with automatic conflict check)
- `PATCH /api/v1/bookings` — update a booking (`write`; requires `id`; emits `booking.updated` or `booking.cancelled`)

### Resource & Capacity (Module 4)
- `GET /api/v1/allocations?userId=&projectId=&limit=` — list allocations (max 100)
- `POST /api/v1/allocations` — create an allocation (`write`; requires `userId`, `projectId`, `allocationPct`, `startDate`; emits `allocation.created`)

### Leave & Attendance (Module 8)
- `GET /api/v1/leaves?userId=&status=&limit=` — list leave requests (max 100)
- `POST /api/v1/leaves` — submit a leave request (`write`; emits `leave.created`)
- `GET /api/v1/holidays?limit=` — list organization holidays (max 100)
- `POST /api/v1/holidays` — create a holiday (`write`; unique date per org; emits `holiday.created`)
- `GET /api/v1/attendance?userId=&date=&from=&to=&limit=` — list attendance records (max 100)
- `POST /api/v1/attendance` — check-in/check-out (`write`; body: `userId`, `action` = `check_in`|`check_out`, optional `timestamp`)

### KRA / KPA (Module 2)
- `GET /api/v1/kras?userId=&cycle=&status=&limit=` — list KRAs (max 100)
- `POST /api/v1/kras` — create a KRA (`write`; emits `kra.created`)

### Risk & Issue (Module 6)
- `GET /api/v1/risks?projectId=&status=&category=&limit=` — list risks (max 100)
- `POST /api/v1/risks` — create a risk (`write`; emits `risk.created`)
- `GET /api/v1/issues?projectId=&status=&severity=&limit=` — list issues (max 100)
- `POST /api/v1/issues` — create an issue (`write`; emits `issue.created`)
- `GET /api/v1/change-requests?projectId=&status=&limit=` — list change requests (max 100)
- `POST /api/v1/change-requests` — create a change request (`write`; requires `title`; optional `projectId`, `description`, `type` = `minor`|`major`|`critical`, `impactAssessment`, `dueDate`; emits `change_request.created`)

### Budget & Financial (Module 5)
- `GET /api/v1/budgets?projectId=&limit=` — list project budgets (max 100)
- `POST /api/v1/budgets` — create/upsert budget for a project (`write`; emits `budget.upserted`)
- `GET /api/v1/expenses?projectId=&category=&limit=` — list expenses (max 100)
- `POST /api/v1/expenses` — create an expense (`write`; requires `incurredById`; emits `expense.created`)

### Collaboration & Docs (Module 7)
- `GET /api/v1/documents?parentId=&limit=` — list documents (max 100; `parentId=root` for top-level)
- `POST /api/v1/documents` — create a document (`write`; emits `document.created`; creates initial version snapshot)

### Core
- `GET /api/v1/me` — org + scopes + enabled modules for the current API key
- `GET /api/v1/notifications?userId=&category=&unreadOnly=&limit=` — list notifications (max 100)
- `PATCH /api/v1/notifications` — mark one notification read (`{ "id": "..." }`) or all as read (`{ "markAllRead": true }`) (`write`)

### Governance & Compliance (Module 10)
- `GET /api/v1/policies?type=&limit=` — list governance policies (max 100)
- `POST /api/v1/policies` — create/upsert policy by type (`write`; one policy per type per org; emits `policy.created`/`policy.updated`)
- `GET /api/v1/signatures?documentType=&documentId=&status=&limit=` — list e-signature requests (max 100)
- `POST /api/v1/signatures` — create a signature request (`write`; requires `documentType`, `documentId`, `signerId`, `signerEmail`; optional `expiresAt`; emits `signature.created`)
- `GET /api/v1/audit?action=&entityType=&actorId=&limit=` — list audit log entries (max 100)

### Disabled modules

Endpoints for disabled modules return **403** (not 404):

```json
{ "error": "module_not_enabled", "moduleKey": "tasks", "message": "..." }
```

## Rate limits

- **Self-hosted:** unlimited
- **Managed Cloud — Starter:** 100 req/min per org
- **Managed Cloud — Business:** 1,000 req/min per org
- **Managed Cloud — Enterprise:** custom

Rate-limited responses return `429 Too Many Requests` with a `Retry-After` header.

## SDKs

Not yet available. The API is plain REST + JSON — use `curl`, `fetch`, or any HTTP client.

## Versioning

The API is versioned via URL (`/api/v1/`). Breaking changes ship under `/api/v2/` with at least 6 months of overlap.

For webhook setup and event payloads, see [Webhooks](/webhooks/).
