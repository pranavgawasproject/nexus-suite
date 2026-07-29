# Nexus Suite â Project Status

> **This file is the single source of truth for "where things actually stand."**

**Last reviewed:** 2026-07-29
**Reviewed by:** Grok

## Track A (this run): Task dependencies UI in task detail dialog

**Code files changed:** `src/components/nexus/tasks-view.tsx`, `status/PROJECT_STATUS.md`

- `TaskDependencies` component in task detail dialog (list / add / remove)
- Relation types: blocks, blocked by, relates-to; candidate task picker excludes self + already-linked
- Wired into `TaskDetailDialog` with tasks list for selection

## â Completed
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

## ð§ Needs Fixing
- (none critical â CI matrix covers tenant, gate, csv, cycles, retros, comments, milestones, dependencies tests)
- After schema change: run `bun run db:push` (or migrate) locally / in deploy so SQLite picks up TaskDependency (and prior Milestone / TaskComment / Cycle / Retrospective if not yet applied)

## ð Future Plan

**Vision:** Become the #1 most-starred, most-forked open-source AI + ERP/PM platform on GitHub, and get accepted into GitHub Sponsors.

### Phase 1 â Core Product (in progress)
- [ ] Finish remaining PRD modules end-to-end (Tasks & Projects, KRA/KPA, Room & Resource Booking, Resource & Capacity, Budget & Financial Tracking, Risk & Issue Management, Collaboration & Docs, Leave & Attendance, Reporting & Analytics, Governance & Compliance)
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

> Researched from top open-source PM/ERP repos (Plane â­ 55k, Huly â­ 24.5k, ERPNext â­ 37.2k, OpenProject, Leantime, Focalboard) â features worth adding to Nexus Suite to compete at their level.

- [x] **Sprints / Cycles API + UI** (inspired by Plane) â schema, `/api/cycles`, CyclesView, and Tasks kanban cycle filter/assign done.
- [x] **Sprint retrospectives API + UI** (inspired by Leantime) â schema + `/api/retrospectives` CRUD + CyclesView list/create/edit.
- [x] **Project Milestones API + UI** (inspired by Plane / OpenProject) â schema + `/api/milestones` CRUD + MilestonesView; task-form assign done.
- [x] **Task dependencies API** (Gantt foundation, inspired by OpenProject) â `TaskDependency` + `/api/dependencies`.
- [ ] **Two-way GitHub sync** (inspired by Huly & Plane) â sync Tasks/Issues module with GitHub Issues (bi-directional create/update/comment sync). High priority â fits dev-tool-savvy audience.
- [ ] **Real-time collaborative Wiki/Docs** (inspired by Plane & Huly) â upgrade `docs-view.tsx` from static docs to real-time collaborative editing (e.g. Yjs/CRDT-based).
- [ ] **Custom fields / metadata-driven forms per module** (inspired by ERPNext DocTypes) â let self-hosters extend Tasks, KRAs, Risks, etc. with custom fields without forking code. Strong fit for open-core/toggleable-module pitch.
- [ ] **Gantt / timeline view with dependencies** (inspired by OpenProject) â visual project timeline layered on Budget & Resource views. Strong enterprise-buyer signal. Depends on task dependencies API (done).

**Suggested build priority:** Dependencies UI â Gantt â GitHub sync â Wiki upgrade â Custom fields.

