# Nexus Suite — Project Status

**Last reviewed:** 2026-07-30  
**Maintainer note:** Autonomous daily runs must prefer Track A (real code) over docs-only commits.

---

## ✅ Completed

### Core
- Row-level multi-tenancy (`orgId` on tables + query scoping)
- Auth (NextAuth), org/user/department models
- Module marketplace + `requireModule()` / public API module gate (403 when disabled)
- Notifications, audit log, API keys, webhooks (HMAC, retry queue)
- Docker Compose self-host kit, seed demo org

### Module 1 — Tasks & Projects
- Projects, tasks, cycles, milestones, dependencies, checklists, comments
- Retrospectives, CSV import/export
- **Task worklogs / time tracking** — Prisma `TaskWorklog`, `/api/worklogs` (CRUD), UI, unit tests, spentHours rollup
- **Public API** — `/api/v1/tasks`, `/api/v1/projects`, **`/api/v1/worklogs`** (GET list by taskId, POST log time)

### Module 2 — KRA/KPA
- Model + `/api/kras` + UI surface

### Module 3 — Rooms
- Rooms, bookings, holidays; `/api/v1/rooms`, `/api/v1/bookings`

### Module 4 — Resource & Capacity
- Allocations API + UI

### Module 5 — Budget & Financial
- Budgets, expenses, GST helpers, AI budget-anomalies route

### Module 6 — Risk & Issue
- Risks, issues, change requests

### Module 7 — Collaboration & Docs
- Documents + versions API

### Module 8 — Leave & Attendance
- Leaves, attendance, holidays
- **Public API** — **`/api/v1/leaves`** (GET list by userId/status, POST create leave request)

### Module 9 — Reporting
- Dashboard + search routes

### Module 10 — Governance
- Policies, signatures, audit export

### Quality
- Tenant isolation tests, module-gate tests, worklog/schema unit tests, CI workflow

---

## 🔧 Needs Fixing

- [ ] Wire `emitEvent` consistently on all mutating internal routes (not only public v1)
- [ ] Public API coverage gaps: budget, risks, kras still internal-only (leave done 2026-07-30)
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
- [ ] Public API PATCH for leave approve/reject (currently internal-only)

---

## Recent maintainer runs

| Date | Track | Summary |
|------|-------|---------|
| 2026-07-29 | A | TaskWorklog schema + `/api/worklogs` + tests; removed broken TaskTimeEntry API |
| 2026-07-30 | A | Public API `/api/v1/worklogs`; restored this status file from PLACEHOLDER |
| 2026-07-30 | A | Public API `/api/v1/leaves` (GET + POST); module-gated, emitEvent on create |
