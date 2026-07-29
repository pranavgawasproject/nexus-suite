# Nexus Suite — Project Status

> **This file is the single source of truth for "where things actually stand."**

**Last reviewed:** 2026-07-29
**Reviewed by:** Grok

## Track A (this run): Task checklists

**Code files changed:** `prisma/schema.prisma`, `src/lib/schemas.ts`, `src/app/api/checklists/route.ts`, `src/components/nexus/tasks-view.tsx`, `tests/task-checklists.test.ts`, `package.json`, `.github/workflows/test-ci.yml`, `status/PROJECT_STATUS.md`

- New `TaskChecklistItem` model (org-scoped, ordered by position)
- `/api/checklists` CRUD under tasks module (`requireModule`, zod, audit)
- Task detail dialog: checklist with add / toggle complete / delete + progress badge
- Unit tests + `test:checklists` wired into `test:all` and CI

## ✅ Completed
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

## 🔧 Needs Fixing
- (none critical — CI matrix covers tenant, gate, csv, cycles, retros, comments, milestones, dependencies, checklists tests)
- After schema change: run `bun run db:push` (or migrate) locally / in deploy so SQLite picks up TaskChecklistItem (and prior TaskDependency / Milestone / TaskComment / Cycle / Retrospective if not yet applied)

## 🚀 Future Plan

**Vision:** Become the #1 most-starred, most-forked open-source AI + ERP/PM platform on GitHub, and get accepted into GitHub Sponsors.

### Phase 1 — Core Product (in progress)
- [ ] Finish remaining PRD modules end-to-end (Tasks & Projects, KRA/KPA, Room & Resource Booking, Resource & Capacity, Budget & Financial Tracking, Risk & Issue Management, Collaboration & Docs, Leave & Attendance, Reporting & Analytics, Governance & Compliance)
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

> Researched from top open-source PM/ERP repos (Plane ⭐ 55k, Huly ⭐ 24.5k, ERPNext ⭐ 37.2k, OpenProject, Leantime, Focalboard) — features worth adding to Nexus Suite to compete at their level.

- [x] **Sprints / Cycles API + UI** (inspired by Plane) — schema, `/api/cycles`, CyclesView, and Tasks kanban cycle filter/assign done.
- [x] **Sprint retrospectives API + UI** (inspired by Leantime) — schema + `/api/retrospectives` CRUD + CyclesView list/create/edit.
- [x] **Project Milestones API + UI** (inspired by Plane / OpenProject) — schema + `/api/milestones` CRUD + MilestonesView; task-form assign done.
- [x] **Task dependencies API** (Gantt foundation, inspired by OpenProject) — `TaskDependency` + `/api/dependencies`.
- [x] **Task dependencies UI** in task detail dialog.
- [x] **Gantt / timeline view with dependencies** (inspired by OpenProject) — CSS timeline bars, filters, dependency labels.
- [x] **Task checklists** (inspired by Plane / Trello) — `TaskChecklistItem` + `/api/checklists` + task detail UI.
- [ ] **Two-way GitHub sync** (inspired by Huly & Plane) — sync Tasks/Issues module with GitHub Issues (bi-directional create/update/comment sync). High priority — fits dev-tool-savvy audience.
- [ ] **Real-time collaborative Wiki/Docs** (inspired by Plane & Huly) — upgrade `docs-view.tsx` from static docs to real-time collaborative editing (e.g. Yjs/CRDT-based).
- [ ] **Custom fields / metadata-driven forms per module** (inspired by ERPNext DocTypes) — let self-hosters extend Tasks, KRAs, Risks, etc. with custom fields without forking code. Strong fit for open-core/toggleable-module pitch.

**Suggested build priority:** GitHub sync → Wiki upgrade → Custom fields → self-host deploy polish.

