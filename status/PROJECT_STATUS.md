# Nexus Suite — Project Status

> **This file is the single source of truth for "where things actually stand."**

**Last reviewed:** 2026-07-31
**Reviewed by:** Grok (daily maintainer)

## Track A (this run): Public API v1 GET/POST milestones + policies

**Code files changed:** `src/app/api/v1/milestones/route.ts`, `src/app/api/v1/policies/route.ts`, `docs/API.md`, `status/PROJECT_STATUS.md`

- Expose module-gated milestones list + create under `/api/v1/milestones` (tasks module)
- Expose module-gated policies list + upsert under `/api/v1/policies` (governance module)
- Zod validation via existing schemas; emit `milestone.created`, `policy.created` / `policy.updated` webhooks
- Document endpoints + events in docs/API.md

## ✅ Completed

- **Public API v1 GET/POST milestones** (`/api/v1/milestones`, tasks module)
- **Public API v1 GET/POST policies** (`/api/v1/policies`, governance module)

- Enhanced /api/health with Prisma ping and module stats
- CSV import API for tasks (`POST /api/import/tasks`) with zod validation, multi-tenancy, audit log
- Shared `src/lib/csv.ts` helpers + pure unit tests (`tests/csv-import.test.ts`)
- **CSV import wizard UI** in Tasks view (`ImportCsvDialog` → `/api/import/tasks`)
- **Wire `test:csv` into package.json and CI** (test:all + workflow step)
- **Wire module-gate tests into CI workflow** (test:gate step)
- **Cycles / Sprints schema + API** (`Cycle` model, `/api/cycles` CRUD under tasks module)
- **Wire `test:cycles` into CI** + `cycleId` filter on `GET /api/tasks`
- **Cycles / Sprints UI** (`CyclesView` + nav wiring)
- **Kanban / Tasks cycle filter + assign cycle on create/edit** (TasksView)
- **Sprint Retrospective schema + API** (`Retrospective` model, `/api/retrospectives` CRUD, unit tests)
- **Sprint retrospectives UI** (list/create/edit from Cycles view)
- **Task comments** — schema model + `/api/comments` CRUD + TaskDetailDialog UI + unit tests + CI
- **Project Milestones** — schema + `/api/milestones` CRUD + unit tests + CI
- **Project Milestones UI** — list/create/edit/delete + nav wiring
- **Assign milestone on task create/edit** (TasksView selector + badges)
- **Task dependencies** — schema + `/api/dependencies` CRUD + unit tests + CI (Gantt foundation)
- **Task dependencies UI** in task detail dialog (list/add/remove blocks & relates)
- **Gantt / timeline view** with dependency labels, filters, nav under Tasks
- **Task checklists** — schema + `/api/checklists` CRUD + UI in task detail + unit tests + CI
- **Task worklogs (time entries)** — `TaskWorklog` model + `/api/worklogs` CRUD + TaskWorklogs UI + unit tests + CI; auto-updates spentHours
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

## 🔧 Needs Fixing
- (none critical — CI matrix covers tenant, gate, csv, cycles, retros, comments, milestones, dependencies, checklists, worklogs tests)
- After schema change: run `bun run db:push` (or migrate) locally / in deploy so SQLite picks up TaskWorklog (and prior models if not yet applied)
- **Follow-up needed:** the module-by-module check below confirms model + API route + UI file *existence* only. A deeper pass (full CRUD wiring, empty states, permissions, test coverage) is still recommended per module before treating any of them as launch-ready.
- Public API docs lag slightly behind shipped routes; keep `docs/API.md` in sync when adding endpoints.

## 🚀 Future Plan

**Vision:** Become the #1 most-starred, most-forked open-source AI + ERP/PM platform on GitHub, and get accepted into GitHub Sponsors.

### Phase 1 — Core Product (core modules built; deeper QA pass recommended)
- [x] Tasks & Projects — full depth (cycles, retros, comments, milestones, dependencies, checklists, worklogs, Gantt, subtasks)
- [x] KRA/KPA — `Kra` model + `/api/kras` + `kra-view.tsx`
- [x] Room & Resource Booking — `Room`/`Booking` models + `/api/rooms`, `/api/bookings` + `rooms-view.tsx`
- [x] Resource & Capacity — `Allocation` model + `/api/allocations` + `resource-view.tsx`
- [x] Budget & Financial Tracking — `Budget`/`Expense` models + `/api/budgets`, `/api/expenses` + `budget-view.tsx`
- [x] Risk & Issue Management — `Risk`/`Issue`/`ChangeRequest` models + `/api/risks`, `/api/issues`, `/api/change-requests` + `risk-view.tsx` + public API for risks/issues
- [x] Collaboration & Docs — `Document`/`DocumentVersion` models + `/api/documents` + `docs-view.tsx`
- [x] Leave & Attendance — `Holiday`/`Leave`/`Attendance` models + `/api/holidays`, `/api/leaves`, `/api/attendance` + `leave-view.tsx` + public API leaves + holidays
- [x] Reporting & Analytics — `reporting-view.tsx` + `/api/dashboard`, `/api/export`
- [x] Governance & Compliance — `Policy`/`Signature` models + `/api/policies` + `governance-view.tsx`
- [x] CSV import wizard UI
- [x] Wire test:csv into package.json / CI
- [x] Full CI refinements (lint, typecheck, tests including module-gate, Docker build) — stable and green
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

### Phase 2 — AI Integration
- [ ] AI-assisted task/project creation and summarization
- [ ] AI-powered reporting & analytics insights
- [ ] AI copilot for admins (governance/compliance checks, KPI suggestions)

### Phase 3 — Growth & Community
- [ ] Public launch push (Reddit, HN, Product Hunt, dev communities)
- [ ] Polished README, demo video/GIFs, live demo instance
- [ ] Complete GitHub Sponsors 2FA verification and get accepted
- [ ] Grow contributor base — good first issues, CONTRIBUTING.md outreach
- [ ] Target: become the top-starred open-source "AI + ERP/Project Management" repo on GitHub

### Phase 4 — Monetization (open-core)
- [ ] Managed hosting offering
- [ ] Support SLAs
- [ ] Compliance add-ons

## 🏆 Competitor-Inspired Features (Future)

> Researched from top open-source PM/ERP repos (Plane, Huly, ERPNext, OpenProject, Leantime, Focalboard) — features worth adding to Nexus Suite to compete at their level.

- [x] **Sprints / Cycles API + UI** (inspired by Plane) — schema, `/api/cycles`, CyclesView, and Tasks kanban cycle filter/assign done.
- [x] **Sprint retrospectives API + UI** (inspired by Leantime) — schema + `/api/retrospectives` CRUD + CyclesView list/create/edit.
- [x] **Project Milestones API + UI** (inspired by Plane / OpenProject) — schema + `/api/milestones` CRUD + MilestonesView; task-form assign done.
- [x] **Task dependencies API** (Gantt foundation, inspired by OpenProject) — `TaskDependency` + `/api/dependencies`.
- [x] **Task dependencies UI** in task detail dialog.
- [x] **Gantt / timeline view with dependencies** (inspired by OpenProject) — CSS timeline bars, filters, dependency labels.
- [x] **Task checklists** (inspired by Plane / Trello) — `TaskChecklistItem` + `/api/checklists` + task detail UI.
- [x] **Task worklogs / time tracking** (inspired by OpenProject / Plane) — `TaskWorklog` + `/api/worklogs` + task detail UI; auto spentHours.
- [ ] **Two-way GitHub sync** (inspired by Huly & Plane) — sync Tasks/Issues module with GitHub Issues (bi-directional create/update/comment sync). High priority — fits dev-tool-savvy audience.
- [ ] **Real-time collaborative Wiki/Docs** (inspired by Plane & Huly) — upgrade `docs-view.tsx` from static docs to real-time collaborative editing (e.g. Yjs/CRDT-based).
- [ ] **Custom fields / metadata-driven forms per module** (inspired by ERPNext DocTypes) — let self-hosters extend Tasks, KRAs, Risks, etc. with custom fields without forking code. Strong fit for open-core/toggleable-module pitch.
- [x] **Public API coverage for remaining modules** (policies/governance, milestones via v1 done; cycles still open). Attendance + holidays + allocations + change-requests + documents + budgets/expenses + KRAs + milestones + policies done.

**Suggested build priority:** GitHub sync → public API cycles → Wiki upgrade → Custom fields → self-host deploy polish.

