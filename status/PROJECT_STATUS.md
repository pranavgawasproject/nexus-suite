# Nexus Suite — Project Status

> **This file is the single source of truth for "where things actually stand."**

**Last reviewed:** 2026-08-09 (Track A: public API zod tests for tasks + documents + holidays)
**Reviewed by:** Autonomous daily maintainer (Grok)

## Track A (2026-08-09 — Public API schema unit tests)

**Code files changed:** `tests/public-tasks.test.ts`, `tests/public-documents.test.ts`, `tests/public-holidays.test.ts`, `status/PROJECT_STATUS.md`

- **Public API tests** — zod unit tests for `createTaskSchema`, `createDocumentSchema` (mirrored), and `createHolidaySchema` (mirrored) covering remaining public create endpoints without prior unit coverage

## ✅ Completed

- **Public API schema unit tests** (tasks + documents + holidays)
- **Public API schema unit tests** (change requests + policies)
- **Public API schema unit tests** (signatures + checklists + attendance + updateRoom)
- **Public API schema unit tests** (comments + dependencies)
- **Public API schema unit tests** (cycles + milestones + retrospectives)
- **Public API schema unit tests** (bookings + allocations)
- **Public API schema unit tests** (budgets/expenses + KRAs)
- **Public API schema unit tests** (projects + risks/issues)
- **Illustrated empty states** (Resource capacity — no team + per-user free capacity)
- **Illustrated empty states** (Tasks list + comments/deps/worklogs/checklist, KRA list, Gantt filters)
- **Illustrated empty states** (Leave requests, Attendance, Holidays)


- **AI integration (Phase 2 - DONE)**:
  - Natural-language task creation (`POST /api/ai/parse-task`)
  - Task summarization (`POST /api/ai/summarize-task`)
  - Budget anomaly detection (`POST /api/ai/budget-anomalies`)
  - Dashboard insights (`POST /api/ai/dashboard-insights`)
  - Admin copilot (`POST /api/ai/admin-copilot`)
- **Two-way GitHub sync (DONE)**
- **Custom fields / metadata-driven forms (API + DB schema DONE)**
- **One-command installer** (`install.sh`)
- **Good first issues**
- **All 10 PRD modules** — full depth (cycles, retros, comments, milestones, dependencies, checklists, worklogs, Gantt, subtasks, CSV import)
- **Public API v1** — 28+ endpoint groups with API-key auth + scopes + 403 module gates
- **Webhooks** — HMAC-signed, 5-retry exponential backoff
- **Self-host kit** — Dockerfile + docker-compose (SQLite + Postgres) + install.sh
- **CI** — GitHub Actions stable and green
- **Verification** — typecheck PASS, lint PASS, build PASS, test:tenant 17/17 PASS
- **License** — AGPL-3.0-or-later
- **Open-core business model**
- **Audit log query filters** (internal + public from/to)
- **Public API leave PATCH** (approve/reject/cancel)
- **Starlight docs site scaffold** (docs-site/)
- **Audit-view UI filters** (date range, actor, action, entityType → `/api/audit`)
- **Webhook recent deliveries** API + UI (GET /api/webhooks/deliveries + Recent deliveries card)
- **Sign-in page shadcn refactor** (Card/Input/Button/Label/Separator)
- **Illustrated empty states** (Risk register tabs + Docs list)
- **Illustrated empty states** (Rooms list, Budget budgets/expenses, Cycles retrospectives)

## 🔧 Active Work & Next Priorities

- **Live Demo Instance** — Deploy auto-resetting demo instance (e.g. `demo.nexussuite.org`)
- **Visual README** — Add high-res screenshots and feature GIFs
- **Documentation site content polish** — expand Starlight pages as features ship
- **Real-time collaborative Wiki/Docs** — Upgrade docs-view to Yjs/CRDT-based collaborative editing
- **Dark mode / mobile audit** — still listed as good-first-issue items in CONTRIBUTING.md

## 🚀 Future Plan & Strategic Roadmap

**Vision:** Become the #1 most-starred, most-forked open-source AI + ERP/PM platform on GitHub.

### Phase 1 — Core Product (COMPLETE ✅)
- [x] All 10 PRD modules — full depth
- [x] Public API v1 — 28+ endpoint groups
- [x] CSV import wizard
- [x] Full CI — stable and green
- [x] Self-host deploy kit (Dockerfile + docker-compose + install.sh)
- [x] Cycles/Sprints, Retrospectives, Milestones, Dependencies, Gantt, Checklists, Worklogs

### Phase 2 — AI Integration & Extensibility (COMPLETE ✅)
- [x] AI-assisted task/project creation and summarization
- [x] AI-powered reporting & analytics insights (dashboard insights)
- [x] AI copilot for admins (governance/compliance checks, KPI suggestions)
- [x] Two-way GitHub sync (issues <-> tasks)
- [x] Custom fields backend & API (ERPNext DocTypes pattern)

### Phase 3 — Polish, UI Completion & Live Demo (IN PROGRESS ⏳)
- [x] Build Custom Fields frontend UI components
- [x] Add Multi-currency support (USD, EUR, GBP) alongside INR
- [x] Add Google & GitHub OAuth login alongside credentials
- [x] Scaffold dedicated documentation site (Starlight under docs-site/)
- [x] Wire audit-view UI filters (API was ready)
- [x] Webhook recent deliveries API + UI
- [x] Sign-in page shadcn refactor
- [x] Illustrated empty states (Risk + Docs)
- [x] Illustrated empty states (Rooms, Budget, Cycles retros)
- [x] Illustrated empty states (Leave requests, Attendance, Holidays)
- [x] Illustrated empty states (Tasks list + sub-panels, KRA, Gantt)
- [x] Illustrated empty states (Resource capacity — no team + per-user free capacity)
- [x] Public API schema unit tests (projects + risks/issues)
- [x] Public API schema unit tests (budgets/expenses + KRAs)
- [x] Public API schema unit tests (bookings + allocations)
- [x] Public API schema unit tests (cycles + milestones + retrospectives)
- [x] Public API schema unit tests (comments + dependencies)
- [x] Public API schema unit tests (signatures + checklists + attendance + updateRoom)
- [x] Public API schema unit tests (change requests + policies)
- [x] Public API schema unit tests (tasks + documents + holidays)
- [ ] Deploy a live 1-click interactive demo instance (e.g., `demo.nexussuite.org`)
- [ ] Upgrade README with rich feature GIFs and screenshots
- [ ] Expand documentation site content

### Phase 4 — Growth, Launch & Community (PLANNED 🎯)
- [ ] Public launch campaign: Hacker News ("Show HN"), Reddit (`r/selfhosted`, `r/opensource`, `r/webdev`), Product Hunt
- [ ] YouTube video walkthrough (2-minute quickstart + feature tour)
- [ ] Set up GitHub Discussions & Discord community for self-hosters
- [ ] Complete GitHub Sponsors verification & onboarding
- [ ] Grow contributor base via documented Good First Issues

### Phase 5 — Monetization & Enterprise (PLANNED 💼)
- [ ] Managed cloud hosting offering (flat per-org pricing)
- [ ] Priority support & SLAs
- [ ] Enterprise compliance add-ons (SOC2 reports, DPAs, dedicated data residency)

---

### 🏆 Competitor-Inspired Features Roadmap

> Researched from top open-source PM/ERP repos (Plane, Huly, ERPNext, OpenProject, Leantime, Focalboard)

- [x] **Sprints / Cycles API + UI** (Plane)
- [x] **Sprint retrospectives API + UI** (Leantime)
- [x] **Project Milestones API + UI** (Plane / OpenProject)
- [x] **Task dependencies API + UI** (OpenProject)
- [x] **Gantt / timeline view** (OpenProject)
- [x] **Task checklists** (Plane / Trello)
- [x] **Task worklogs / time tracking** (OpenProject / Plane)
- [x] **Two-way GitHub sync** (Huly & Plane) — **DONE**
- [x] **Custom fields / metadata-driven forms** (ERPNext DocTypes) — **API + UI DONE**
- [ ] **Real-time collaborative Wiki/Docs** (Plane & Huly) — upgrade `docs-view.tsx` to Yjs/CRDT-based collaborative editing

**Suggested build priority:** Real-time Wiki upgrade → Live Demo → Visual README → Documentation content → Public Launch Push.
