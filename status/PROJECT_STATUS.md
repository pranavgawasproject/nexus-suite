# Nexus Suite — Project Status

> **This file is the single source of truth for "where things actually stand."**

**Last reviewed:** 2026-07-26
**Reviewed by:** Grok

## Track A (this run): CSV import API for Tasks

**Code files changed:** `src/app/api/import/route.ts`

Implemented POST `/api/import` for the Tasks module (PRD §5 data portability):
- Accepts `{ module: "tasks", csv, dryRun?, projectId? }`
- Parses CSV with header mapping: title*, projectName/projectId, status, priority, type, description, dueDate, tags, assigneeEmail
- `dryRun: true` returns row-level validation without writes
- Resolves project by name or id, assignee by email within the org
- Validates status/priority/type enums; appends positions per project+status
- Gated with `requireModule('tasks')`, org-scoped, audited as `tasks.csv_imported`

Moved CSV import (tasks) to Completed. Remaining: multi-module wizard UI, other entity types, full CI polish.

## ✅ Completed
- Enhanced `/api/health` with Prisma ping and module stats
- Basic health check API route for monitoring
- CSV import API for Tasks (`POST /api/import`, dry-run + commit)

## 🔧 Needs Fixing
- Full CI workflow refinements if needed (lint, typecheck, tests, Docker build — keep green)
- CSV import wizard **UI** (frontend mapping UI; API for tasks is done)
- Extend import to more modules (rooms/bookings, leave, expenses) when needed

## 🚀 Future Plan

**Vision:** Become the #1 most-starred, most-forked open-source AI + ERP/PM platform on GitHub, and get accepted into GitHub Sponsors.

### Phase 1 — Core Product (in progress)
- [ ] Finish remaining PRD modules end-to-end (Tasks & Projects polish, KRA/KPA, Room & Resource Booking, Resource & Capacity, Budget & Financial Tracking, Risk & Issue Management, Collaboration & Docs, Leave & Attendance, Reporting & Analytics, Governance & Compliance)
- [x] CSV import API (tasks) — wizard UI still open
- [ ] Full CI refinements (lint, typecheck, tests, Docker build) — stable and green
- [ ] Polish self-host deploy kit (Docker Compose one-command installer, docs)

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

- [ ] **Sprints / Cycles view** (inspired by Plane) — iteration/sprint management on top of Tasks & Projects, with burndown-style tracking. New `cycles-view.tsx` + `/api/cycles` route.
- [ ] **Two-way GitHub sync** (inspired by Huly & Plane) — sync Tasks/Issues module with GitHub Issues (bi-directional create/update/comment sync). High priority — fits dev-tool-savvy audience.
- [ ] **Real-time collaborative Wiki/Docs** (inspired by Plane & Huly) — upgrade `docs-view.tsx` from static docs to real-time collaborative editing (e.g. Yjs/CRDT-based).
- [ ] **Custom fields / metadata-driven forms per module** (inspired by ERPNext DocTypes) — let self-hosters extend Tasks, KRAs, Risks, etc. with custom fields without forking code. Strong fit for open-core/toggleable-module pitch.
- [ ] **Gantt / timeline view with dependencies** (inspired by OpenProject) — visual project timeline layered on Budget & Resource views. Strong enterprise-buyer signal.
- [ ] **Sprint retrospectives** (inspired by Leantime) — lightweight post-sprint/project review tool, pairs naturally with KRA/KPA module.

**Suggested build priority:** Sprints/Cycles + GitHub sync first (most "starrable", aligns with existing dev audience) → then Wiki upgrade → Custom fields → Gantt → Retrospectives.
