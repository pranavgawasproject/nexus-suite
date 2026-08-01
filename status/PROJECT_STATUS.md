# Nexus Suite — Project Status

> **This file is the single source of truth for "where things actually stand."**

**Last reviewed:** 2026-08-01
**Reviewed by:** Grok (daily maintainer)

## Track A (this run): Public API v1 GET notifications

**Code files changed:** `src/app/api/v1/notifications/route.ts`, `docs/API.md`, `status/PROJECT_STATUS.md`

- Expose core notifications list under `/api/v1/notifications`
- Filters: userId, category, unreadOnly, limit (max 100)
- Document endpoint in docs/API.md

## ✅ Completed

- **Public API v1 GET notifications** (`/api/v1/notifications`, core)
- **Public API v1 GET audit** (`/api/v1/audit`, governance module)
- **Public API v1 GET/POST signatures** (`/api/v1/signatures`, governance module)
- **Public API v1 GET/POST dependencies** (`/api/v1/dependencies`, tasks module)
- **Public API v1 GET/POST signatures** (`/api/v1/signatures`, governance module)
- **Public API v1 GET/POST retrospectives** (`/api/v1/retrospectives`, tasks module)
- **Public API v1 GET/POST comments** (`/api/v1/comments`, tasks module)
- **Public API v1 GET/POST checklists** (`/api/v1/checklists`, tasks module)
- **Public API v1 GET/POST cycles** (`/api/v1/cycles`, tasks module)
- **Public API v1 GET/POST milestones** (`/api/v1/milestones`, tasks module)
- **Public API v1 GET/POST policies** (`/api/v1/policies`, governance module)

- Enhanced /api/health with Prisma ping and module stats
- CSV import API for tasks (`POST /api/import/tasks`) with zod validation, multi-tenancy, audit log
- Shared `src/lib/csv.ts` helpers + pure unit tests (`tests/csv-import.test.ts`)
- **CSV import wizard UI** in Tasks view (`ImportCsvDialog` â `/api/import/tasks`)
- **Wire `test:csv` into package.json and CI** (test:all + workflow step)
- **Wire module-gate tests into CI workflow** (test:gate step)
- **Cycles / Sprints schema + API** (`Cycle` model, `/api/cycles` CRUD under tasks module)
- **Wire `test:cycles` into CI** + `cycleId` filter on `GET /api/tasks`
- **Cycles / Sprints UI** (`CyclesView` + nav wiring)
- **Kanban / Tasks cycle filter + assign cycle on create/edit** (TasksView)
- **Sprint Retrospective schema + API** (`Retrospective` model, `/api/retrospectives` CRUD, unit tests)
- **Sprint retrospectives UI** (list/create/edit from Cycles view)
- **Task comments** â schema model + `/api/comments` CRUD + TaskDetailDialog UI + unit tests + CI
- **Project Milestones** â schema + `/api/milestones` CRUD + unit tests + CI
- **Project Milestones UI** â list/create/edit/delete + nav wiring
- **Assign milestone on task create/edit** (TasksView selector + badges)
- **Task dependencies** â schema + `/api/dependencies` CRUD + unit tests + CI (Gantt foundation)
- **Task dependencies UI** in task detail dialog (list/add/remove blocks & relates)
- **Gantt / timeline view** with dependency labels, filters, nav under Tasks
- **Task checklists** â schema + `/api/checklists` CRUD + UI in task detail + unit tests + CI
- **Task worklogs (time entries)** â `TaskWorklog` model + `/api/worklogs` CRUD + TaskWorklogs UI + unit tests + CI; auto-updates spentHours
- **Removed broken `/api/time-entries` duplicate** (no Prisma model; worklogs is canonical)
- **parentId subtasks** wired through schemas, API, tests, and CI
- **Public API v1** for tasks, projects, worklogs, rooms, bookings, risks, leaves, me
- **Public API v1 GET/POST issues** (`/api/v1/issues`, module-gated, webhook on create)
- **Public API v1 GET/POST kras** (`/api/v1/kras`, module-gated, webhook on create)
- **Public API v1 GET/POST budgets + expenses** (`/api/v1/budgets`, `/api/v1/expenses`, module-gated, webhooks)
- **Public API v1 GET/POST documents** (`/api/v1/documents`, collab module)
- **Public API v1 GET/POST allocations** (`/api/v1/allocations`, resource module)
- **Public API v1 GET/POST change-requests** (`/api/v1/change-requests`, risk module)
- **Public API v1 GET/POST holidays** (`/api/v1/holidays`, leave module)
- **Public API v1 GET/POST attendance** (`/api/v1/attendance`, leave module)
- **2026-07-29 code audit** confirmed Prisma models, API routes, and UI view files exist for all 10 PRD modules

## ð§ Needs Fixing
- (none critical â CI matrix covers tenant, gate, csv, cycles, retros, comments, milestones, dependencies, checklists, worklogs tests)
- After schema change: run `bun run db:push` (or migrate) locally / in deploy so SQLite picks up TaskWorklog (and prior models if not yet applied)
- **Follow-up needed:** the module-by-module check below confirms model + API route + UI file *existence* only. A deeper pass (full CRUD wiring, empty states, permissions, test coverage) is still recommended per module before treating any of them as launch-ready.
- Public API docs lag slightly behind shipped routes; keep `docs/API.md` in sync when adding endpoints.

## ð Future Plan

**Vision:** Become the #1 most-starred, most-forked open-source AI + ERP/PM platform on GitHub, and get accepted into GitHub Sponsors.

### Phase 1 â Core Product (core modules built; deeper QA pass recommended)
- [x] Tasks & Projects â full depth (cycles, retros, comments, milestones, dependencies, checklists, worklogs, Gantt, subtasks)
- [x] KRA/KPA â `Kra` model + `/api/kras` + `kra-view.tsx`
- [x] Room & Resource Booking â `Room`/`Booking` models + `/api/rooms`, `/api/bookings` + `rooms-view.tsx`
- [x] Resource & Capacity â `Allocation` model + `/api/allocations` + `resource-view.tsx`
- [x] Budget & Financial Tracking â `Budget`/`Expense` models + `/api/budgets`, `/api/expenses` + `budget-view.tsx`
- [x] Risk & Issue Management â `Risk`/`Issue`/`ChangeRequest` models + `/api/risks`, `/api/issues`, `/api/change-requests` + `risk-view.tsx` + public API for risks/issues
- [x] Collaboration & Docs â `Document`/`DocumentVersion` models + `/api/documents` + `docs-view.tsx`
- [x] Leave & Attendance â `Holiday`/`Leave`/`Attendance` models + `/api/holidays`, `/api/leaves`, `/api/attendance` + `leave-view.tsx` + public API leaves + holidays
- [x] Reporting & Analytics â `reporting-view.tsx` + `/api/dashboard`, `/api/export`
- [x] Governance & Compliance â `Policy`/`Signature` models + `/api/policies` + `governance-view.tsx`
- [x] CSV import wizard UI
- [x] Wire test:csv into package.json / CI
- [x] Full CI refinements (lint, typecheck, tests including module-gate, Docker build) â stable and green
- [ ] Polish self-host deploy kit (Docker Compose one-command installer, docs)
- [x] Cycles / Sprints backend (schema + API)
- [x] Wire test:cycles into CI + task list filter by cycleId
- [x] Cycles / Sprints UI view
- [x] Kanban cycle filter in Tasks board
- [x] Sprint retrospectives API (schema + CRUD)
- [x] Sprint retrospectives UI (list/create from Cycles view)
- [x] Task comments (schema + API + UI + CI)
- [x] Project Milestones (schema + API + tests + CI)
- [x] Milestones UI (list/create/edit + nav)
- [x] Assign milestone on task create/edit (TasksView selector)
- [x] Task dependencies (schema + API + tests + CI)
- [x] Task dependencies UI in task detail dialog
- [x] Gantt / timeline view with dependencies
- [x] Task checklists (schema + API + UI + CI)
- [x] Task worklogs / time entries (schema + API + UI + CI)
- [x] Remove broken TaskTimeEntry duplicate API
- [x] Public API v1 issues
- [x] Public API v1 kras
- [x] Public API v1 budgets + expenses
- [x] Public API v1 documents
- [x] Public API v1 allocations
- [x] Public API v1 change-requests
- [x] Public API v1 holidays
- [x] Public API v1 attendance
- [x] Public API v1 milestones
- [x] Public API v1 policies
- [x] Public API v1 comments
- [x] Public API v1 checklists
- [x] Public API v1 cycles
- [x] Public API v1 cycles

### Phase 2 â AI Integration
- [ ] AI-assisted task/project creation and summarization
- [ ] AI-powered reporting & analytics insights
- [ ] AI copilot for admins (governance/compliance checks, KPI suggestions)

### Phase 3 â Growth & Community
- [ ] Public launch push (Reddit, HN, Product Hunt, dev communities)
- [ ] Polished README, demo video/GIFs, live demo instance
- [ ] Complete GitHub Sponsors 2FA verification and get accepted
- [ ] Grow contributor base â good first issues, CONTRIBUTING.md outreach
- [ ] Target: become the top-starred open-source "AI + ERP/Project Management" repo on GitHub

### Phase 4 â Monetization (open-core)
- [ ] Managed hosting offering
- [ ] Support SLAs
- [ ] Compliance add-ons

## ð Competitor-Inspired Features (Future)

> Researched from top open-source PM/ERP repos (Plane, Huly, ERPNext, OpenProject, Leantime, Focalboard) â features worth adding to Nexus Suite to compete at their level.

- [x] **Sprints / Cycles API + UI** (inspired by Plane) â schema, `/api/cycles`, CyclesView, and Tasks kanban cycle filter/assign done.
- [x] **Sprint retrospectives API + UI** (inspired by Leantime) â schema + `/api/retrospectives` CRUD + CyclesView list/create/edit.
- [x] **Project Milestones API + UI** (inspired by Plane / OpenProject) â schema + `/api/milestones` CRUD + MilestonesView; task-form assign done.
- [x] **Task dependencies API** (Gantt foundation, inspired by OpenProject) â `TaskDependency` + `/api/dependencies`.
- [x] **Task dependencies UI** in task detail dialog.
- [x] **Gantt / timeline view with dependencies** (inspired by OpenProject) â CSS timeline bars, filters, dependency labels.
- [x] **Task checklists** (inspired by Plane / Trello) â `TaskChecklistItem` + `/api/checklists` + task detail UI.
- [x] **Task worklogs / time tracking** (inspired by OpenProject / Plane) â `TaskWorklog` + `/api/worklogs` + task detail UI; auto spentHours.
- [ ] **Two-way GitHub sync** (inspired by Huly & Plane) â sync Tasks/Issues module with GitHub Issues (bi-directional create/update/comment sync). High priority â fits dev-tool-savvy audience.
- [ ] **Real-time collaborative Wiki/Docs** (inspired by Plane & Huly) â upgrade `docs-view.tsx` from static docs to real-time collaborative editing (e.g. Yjs/CRDT-based).
- [ ] **Custom fields / metadata-driven forms per module** (inspired by ERPNext DocTypes) â let self-hosters extend Tasks, KRAs, Risks, etc. with custom fields without forking code. Strong fit for open-core/toggleable-module pitch.
- [x] **Public API coverage for remaining modules** (policies/governance, milestones, cycles via v1 done). Attendance + holidays + allocations + change-requests + documents + budgets/expenses + KRAs + milestones + policies done.

**Suggested build priority:** GitHub sync â public API cycles â Wiki upgrade â Custom fields â self-host deploy polish.

