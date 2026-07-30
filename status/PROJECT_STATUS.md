# Nexus Suite — Project Status

> **This file is the single source of truth for "where things actually stand."**

**Last reviewed:** 2026-07-30
**Reviewed by:** Grok (autonomous daily maintainer)

## Track A (this run): Public API v1 for risks

**Code files changed:** `src/app/api/v1/risks/route.ts` (new), `docs/API.md`, `status/PROJECT_STATUS.md`

- `GET /api/v1/risks` — list risks with projectId/status/category filters (read scope, module `risk`)
- `POST /api/v1/risks` — create risk with zod validation, org-scoped project/owner checks, severity = likelihood × impact
- Emits `risk.created` webhook event on create
- Documented in `docs/API.md` (also backfilled worklogs endpoints missing from docs)

## ✅ Completed

### Core
- Row-level multi-tenancy (`orgId` on tables + query scoping)
- Auth (NextAuth), org/user/department models
- Module marketplace + `requireModule()` / public API module gate (403 when disabled)
- Notifications, audit log, API keys, webhooks (HMAC, retry queue)
- Docker Compose self-host kit, seed demo org

### Module 1 — Tasks & Projects
- Projects, tasks, cycles, milestones, dependencies, checklists, comments, retrospectives
- CSV import/export, Gantt/timeline
- Task worklogs (`TaskWorklog` + `/api/worklogs` + UI + tests)
- Subtasks via `parentId` (schemas, API validation, one-level nesting, subtaskCount, tests/CI)
- Public API: `/api/v1/tasks`, `/api/v1/projects`, `/api/v1/worklogs`

### Module 2 — KRA/KPA
- Model + `/api/kras` + UI surface

### Module 3 — Rooms
- Rooms, bookings, holidays; `/api/v1/rooms`, `/api/v1/bookings`

### Module 4 — Resource & Capacity
- Allocations API + UI

### Module 5 — Budget & Financial
- Budgets, expenses, GST helpers, AI budget-anomalies route

### Module 6 — Risk & Issue
- Risks, issues, change requests (internal APIs + UI)
- **Public API** — `GET/POST /api/v1/risks`

### Module 7 — Collaboration & Docs
- Documents + versions API

### Module 8 — Leave & Attendance
- Leaves, attendance, holidays

### Module 9 — Reporting
- Dashboard + search routes

### Module 10 — Governance
- Policies, signatures, audit export

### Quality
- Tenant isolation tests, module-gate tests, worklog/subtask schema unit tests, CI workflow

---

## 🔧 Needs Fixing

- [ ] Wire `emitEvent` consistently on all mutating internal routes (not only public v1)
- [ ] Public API coverage gaps: leave, budget, kras still internal-only
- [ ] Webhook delivery integration tests (HMAC verify + retry backoff)
- [ ] Replace demo-session `getDemoContext()` paths with real session auth for production hardening

---

## 🔮 Future

- [ ] Two-way Google Calendar / Outlook sync for rooms
- [ ] Slack / Teams native notifications
- [ ] SAML/OIDC (PRD: core, not gated)
- [ ] Scheduled report exports
- [ ] Full org JSON export wizard
- [ ] i18n string externalization (Hindi + demand-based)
- [ ] Two-way GitHub Issues sync
- [ ] Real-time collaborative wiki (Yjs/CRDT)
- [ ] Custom fields / metadata-driven forms per module

---

## Recent maintainer runs

| Date | Track | Summary |
|------|-------|---------|
| 2026-07-29 | A | TaskWorklog schema + `/api/worklogs` + tests; removed broken TaskTimeEntry API |
| 2026-07-30 | A | Public API `/api/v1/worklogs`; restored PROJECT_STATUS |
| 2026-07-30 | A | Wire `parentId` subtasks (schemas, API, tests, CI) |
| 2026-07-30 | A | Public API `GET/POST /api/v1/risks` + API docs |
