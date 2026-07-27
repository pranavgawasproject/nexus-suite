# Nexus Suite \u2014 Project Status

> **This file is the single source of truth for "where things actually stand."**

**Last reviewed:** 2026-07-27
**Reviewed by:** Grok

## Track A (this run): Tasks CSV export API + shared CSV serializer

**Code files changed:** `src/lib/csv.ts`, `src/app/api/export/tasks/route.ts`, `tests/csv-import.test.ts`

- Added `escapeCsvCell` + `rowsToCsv` pure helpers and `TASK_CSV_EXPORT_COLUMNS`
- New `GET /api/export/tasks` (optional `projectId`) \u2014 module-gated, multi-tenant, audited, import-round-trip columns
- Extended unit tests for CSV serialization and round-trip parse

## \u2705 Completed
- Enhanced /api/health with Prisma ping and module stats
- CSV import API for tasks (`POST /api/import/tasks`) with zod validation, multi-tenancy, audit log
- Shared `src/lib/csv.ts` helpers + pure unit tests (`tests/csv-import.test.ts`)
- **CSV import wizard UI** in Tasks view (`ImportCsvDialog` \u2192 `/api/import/tasks`)
- **Wire `test:csv` into package.json and CI** (test:all + workflow step)
- **Wire module-gate tests into CI workflow** (test:gate step)
- **Tasks CSV export API** (`GET /api/export/tasks`) + `rowsToCsv` helpers

## \ud83d\udd27 Needs Fixing
- (none critical \u2014 CI matrix now covers tenant, gate, and csv tests)

## \ud83d\ude80 Future Plan

**Vision:** Become the #1 most-starred, most-forked open-source AI + ERP/PM platform on GitHub, and get accepted into GitHub Sponsors.

### Phase 1 \u2014 Core Product (in progress)
- [ ] Finish remaining PRD modules end-to-end (Tasks & Projects, KRA/KPA, Room & Resource Booking, Resource & Capacity, Budget & Financial Tracking, Risk & Issue Management, Collaboration & Docs, Leave & Attendance, Reporting & Analytics, Governance & Compliance)
- [x] CSV import wizard UI
- [x] Wire test:csv into package.json / CI
- [x] Full CI refinements (lint, typecheck, tests including module-gate, Docker build) \u2014 stable and green
- [x] Tasks CSV export (API + shared serializer)
- [ ] Polish self-host deploy kit (Docker Compose one-command installer, docs)

### Phase 2 \u2014 AI Integration
- [ ] AI-assisted task/project creation and summarization
- [ ] AI-powered reporting & analytics insights
- [ ] AI copilot for admins (governance/compliance checks, KPI suggestions)

### Phase 3 \u2014 Growth & Community
- [ ] Public launch push (Reddit, HN, Product Hunt, dev communities)
- [ ] Polished README, demo video/GIFs, live demo instance
- [ ] Complete GitHub Sponsors 2FA verification and get accepted
- [ ] Grow contributor base \u2014 good first issues, CONTRIBUTING.md outreach
- [ ] Target: become the top-starred open-source "AI + ERP/Project Management" repo on GitHub

### Phase 4 \u2014 Monetization (open-core)
- [ ] Managed hosting offering
- [ ] Support SLAs
- [ ] Compliance add-ons

## \ud83c\udfc6 Competitor-Inspired Features (Future)

> Researched from top open-source PM/ERP repos (Plane \u2b50 55k, Huly \u2b50 24.5k, ERPNext \u2b50 37.2k, OpenProject, Leantime, Focalboard) \u2014 features worth adding to Nexus Suite to compete at their level.

- [ ] **Sprints / Cycles view** (inspired by Plane) \u2014 iteration/sprint management on top of Tasks & Projects, with burndown-style tracking. New `cycles-view.tsx` + `/api/cycles` route.
- [ ] **Two-way GitHub sync** (inspired by Huly & Plane) \u2014 sync Tasks/Issues module with GitHub Issues (bi-directional create/update/comment sync). High priority \u2014 fits dev-tool-savvy audience.
- [ ] **Real-time collaborative Wiki/Docs** (inspired by Plane & Huly) \u2014 upgrade `docs-view.tsx` from static docs to real-time collaborative editing (e.g. Yjs/CRDT-based).
- [ ] **Custom fields / metadata-driven forms per module** (inspired by ERPNext DocTypes) \u2014 let self-hosters extend Tasks, KRAs, Risks, etc. with custom fields without forking code. Strong fit for open-core/toggleable-module pitch.
- [ ] **Gantt / timeline view with dependencies** (inspired by OpenProject) \u2014 visual project timeline layered on Budget & Resource views. Strong enterprise-buyer signal.
- [ ] **Sprint retrospectives** (inspired by Leantime) \u2014 lightweight post-sprint/project review tool, pairs naturally with KRA/KPA module.

**Suggested build priority:** Sprints/Cycles + GitHub sync first (most "starrable", aligns with existing dev audience) \u2192 then Wiki upgrade \u2192 Custom fields \u2192 Gantt \u2192 Retrospectives.
