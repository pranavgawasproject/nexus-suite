# Nexus Suite — Project Status

> **This file is the single source of truth for "where things actually stand."**

**Last reviewed:** 2026-07-27
**Reviewed by:** Grok

## Track A (this run): Cycles / Sprints API + schema + unit tests

**Code files changed:** `prisma/schema.prisma`, `src/lib/schemas.ts`, `src/app/api/cycles/route.ts`, `tests/cycles.test.ts`, `package.json`

- Added `Cycle` Prisma model (org + optional project scoped, status planned/active/completed)
- Zod schemas for create/update/query with date-order refinement
- Full CRUD API at `/api/cycles` gated by `requireModule('tasks')`, multi-tenant, audit-logged
- Pure unit tests for cycle schemas; wired into `test:all` / `test:cycles`

## ✅ Completed
- Enhanced /api/health with Prisma ping and module stats
- CSV import API for tasks (`POST /api/import/tasks`) with zod validation, multi-tenancy, audit log
- Shared `src/lib/csv.ts` helpers + pure unit tests (`tests/csv-import.test.ts`)
- **CSV import wizard UI** in Tasks view (`ImportCsvDialog` → `/api/import/tasks`)
- **Wire `test:csv` into package.json and CI** (test:all + workflow step)
- **Wire module-gate tests into CI workflow** (test:gate step)
- **Cycles / Sprints foundation** — schema, API, zod schemas, unit tests (UI view deferred)

## 🔧 Needs Fixing
- (none critical — CI matrix covers tenant, gate, csv, and cycles schema tests)
- After deploy: run `prisma db push` (or migrate) so Cycle table exists in existing installs

## 🚀 Future Plan

**Vision:** Become the #1 most-starred, most-forked open-source AI + ERP/PM platform on GitHub, and get accepted into GitHub Sponsors.

### Phase 1 — Core Product (in progress)
- [ ] Finish remaining PRD modules end-to-end (Tasks & Projects, KRA/KPA, Room & Resource Booking, Resource & Capacity, Budget & Financial Tracking, Risk & Issue Management, Collaboration & Docs, Leave & Attendance, Reporting & Analytics, Governance & Compliance)
- [x] CSV import wizard UI
- [x] Wire test:csv into package.json / CI
- [x] Full CI refinements (lint, typecheck, tests including module-gate, Docker build) — stable and green
- [ ] Polish self-host deploy kit (Docker Compose one-command installer, docs)
- [x] Cycles / Sprints API foundation
- [ ] Cycles UI view (`cycles-view.tsx`) + task↔cycle linking

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

- [x] **Sprints / Cycles view** (inspired by Plane) — API + schema done; UI + burndown still open. New `cycles-view.tsx` + task linking remaining.
- [ ] **Two-way GitHub sync** (inspired by Huly & Plane) — sync Tasks/Issues module with GitHub Issues (bi-directional create/update/comment sync). High priority — fits dev-tool-savvy audience.
- [ ] **Real-time collaborative Wiki/Docs** (inspired by Plane & Huly) — upgrade `docs-view.tsx` from static docs to real-time collaborative editing (e.g. Yjs/CRDT-based).
- [ ] **Custom fields / metadata-driven forms per module** (inspired by ERPNext DocTypes) — let self-hosters extend Tasks, KRAs, Risks, etc. with custom fields without forking code. Strong fit for open-core/toggleable-module pitch.
- [ ] **Gantt / timeline view with dependencies** (inspired by OpenProject) — visual project timeline layered on Budget & Resource views. Strong enterprise-buyer signal.
- [ ] **Sprint retrospectives** (inspired by Leantime) — lightweight post-sprint/project review tool, pairs naturally with KRA/KPA module.

**Suggested build priority:** Cycles UI + task linking next → GitHub sync → Wiki upgrade → Custom fields → Gantt → Retrospectives.
