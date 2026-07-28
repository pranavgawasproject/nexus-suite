# Nexus Suite — Project Status

> **This file is the single source of truth for "where things actually stand."**

**Last reviewed:** 2026-07-28
**Reviewed by:** Grok

## Track A (this run): Restore TaskComment model + schemas (regression fix)

**Code files changed:** `prisma/schema.prisma`, `src/lib/schemas.ts`, `package.json`, `status/PROJECT_STATUS.md`

- Restored `TaskComment` Prisma model and relations on Organization, User, and Task (accidentally dropped after earlier commit)
- Restored zod schemas: `createTaskCommentSchema`, `updateTaskCommentSchema`, `taskCommentQuerySchema`
- Wired `test:comments` into package.json and `test:all` so CI covers existing `/api/comments` + unit tests
- `/api/comments` route and `tests/task-comments.test.ts` were already present; schema/schemas mismatch would break Prisma client and validation

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
- **TaskComment model + schemas restored** (API + tests already existed; schema/zod re-aligned)

## 🔧 Needs Fixing
- (none critical — CI matrix covers tenant, gate, csv, cycles, retros, comments tests)
- After schema change: run `bun run db:push` (or migrate) locally / in deploy so SQLite picks up Cycle, Task.cycleId, Retrospective, and TaskComment

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
- [x] TaskComment schema + zod restored and test wired into CI

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
- [ ] **Task comments UI** (API exists) — surface comments on task detail drawer/dialog in TasksView.
- [ ] **Two-way GitHub sync** (inspired by Huly & Plane) — sync Tasks/Issues module with GitHub Issues (bi-directional create/update/comment sync). High priority — fits dev-tool-savvy audience.
- [ ] **Real-time collaborative Wiki/Docs** (inspired by Plane & Huly) — upgrade `docs-view.tsx` from static docs to real-time collaborative editing (e.g. Yjs/CRDT-based).
- [ ] **Custom fields / metadata-driven forms per module** (inspired by ERPNext DocTypes) — let self-hosters extend Tasks, KRAs, Risks, etc. with custom fields without forking code. Strong fit for open-core/toggleable-module pitch.
- [ ] **Gantt / timeline view with dependencies** (inspired by OpenProject) — visual project timeline layered on Budget & Resource views. Strong enterprise-buyer signal.

**Suggested build priority:** Task comments UI → GitHub sync → Wiki upgrade → Custom fields → Gantt.

