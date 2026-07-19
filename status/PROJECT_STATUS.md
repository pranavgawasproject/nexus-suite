# Nexus Suite — Project Status

> **This file is the single source of truth for "where things actually stand."**
> It gets updated every time the project is reviewed. Do not treat README.md or docs/PRD.md as the current-status source — this file is.

**Last reviewed:** 2026-07-19
**Reviewed by:** Claude (direct repo work, post-PRD audit)
**Overall phase:** Phase 1 MVP complete + Phase 2 modules scaffolded (Leave, Resource, KRA, Budget). Hardening pass landed (403 module enforcement + zod validation + tenant-isolation tests). Dev-server compile timeout under Turbopack remains an environment issue (see §3).

---

## 1. Snapshot Summary

| Metric | Value |
|---|---|
| Current phase | Phase 1 MVP ✅ + Phase 2 (partial: M2, M4, M5, M8) ✅ |
| Modules live | Core, M1 Tasks, M3 Rooms, M9 Reporting, **M2 KRA/KPA, M4 Resource, M5 Budget, M8 Leave** |
| Modules still pending | M6 Risk, M7 Collab, M10 Governance (Phase 3) |
| API routes | 21 (11 module-scoped, all with 403 gate + zod validation) |
| Tenant-isolation tests | 17 passing (`bun run test:tenant`) |
| Module-gate tests | Scaffolded (`bun run test:gate`) — pending dev-server stability |

| Repo | [github.com/pranavgawasproject/nexus-suite](https://github.com/pranavgawasproject/nexus-suite) (public) |
| Stack | Next.js 16 (App Router, Turbopack), TypeScript 5, Tailwind 4 + shadcn/ui, Prisma + SQLite (MVP), Zustand + TanStack Query, Recharts, dnd-kit, Framer Motion, **zod** (validation) |

---

## 2. ✅ Completed

### Core
- [x] Session bootstrap (`/api/session`) — ensures modules registered per org
- [x] RBAC roles (Admin/Manager/Employee/Guest structure present in schema)
- [x] Audit log — API (`/api/audit`) + UI (`audit-view.tsx`) — last 100 events with actor + metadata
- [x] Notifications — API (`/api/notifications`) + central `createNotification()` helper used by all module routes (PRD §5.5 cross-module notification architecture)
- [x] Cross-module global search — API (`/api/search`)
- [x] Team/org structure — API (`/api/team`) — users + departments
- [x] Module Marketplace — API (`/api/modules`, toggle POST) + UI (`settings-view.tsx`) with pricing tiers
- [x] Onboarding wizard — full 4-step flow (welcome → replace → modules → confirm), `onboarding-wizard.tsx`
- [x] Data export — per-module JSON/CSV, API (`/api/export`) + UI (`export-view.tsx`); now includes Leave/Resource/KRA/Budget data
- [x] App shell — `app-shell.tsx`, module-aware `sidebar.tsx`, `topbar.tsx`
- [x] Multi-tenancy — row-level (`orgId` on every table) implemented in `prisma/schema.prisma`, matches PRD §2.4 decision
- [x] Demo seed data — idempotent seeder (`src/lib/seed.ts`), seeds "Acme Design Studio" demo org (5 users, 3 projects, 12 tasks, 4 rooms, 7 bookings, 5 leave requests, 8 allocations, 7 KRAs, 3 budgets, 7 expenses, 4 holidays, 15 attendance records)

### Module 1 — Tasks & Projects
- [x] Projects + Tasks CRUD — API (`/api/projects`, `/api/tasks`)
- [x] Kanban + list views, drag-and-drop status — `tasks-view.tsx`
- [x] Priorities, types, assignees, due dates, estimates, task detail editor

### Module 3 — Meeting Room & Resource Booking
- [x] Room inventory with amenities — API (`/api/rooms`)
- [x] Bookings CRUD with conflict prevention + recurrence — API (`/api/bookings`)
- [x] Week-view calendar UI — `rooms-view.tsx`

### Module 9 — Reporting & Analytics
- [x] Cross-module KPI aggregation — API (`/api/dashboard`) — now aggregates KPIs from all 7 enabled modules
- [x] Full BI dashboard with multiple chart types — `reporting-view.tsx`
- [x] Graceful hiding of widgets for disabled modules (both API and UI level)

### Module 8 — Leave & Attendance (Phase 2 — NEW)
- [x] Leave requests with type/reason/half-day — API (`/api/leaves`)
- [x] Approval workflow (manager notified via cross-module notifications)
- [x] Attendance check-in/check-out with unique per-day constraint — API (`/api/attendance`)
- [x] Holiday calendar (org-level) — API (`/api/holidays`)
- [x] UI — `leave-view.tsx` with 3 tabs (Leave requests / Attendance / Holidays)

### Module 4 — Resource & Capacity (Phase 2 — NEW)
- [x] Allocation CRUD with capacity % — API (`/api/allocations`)
- [x] Per-user workload aggregation, over-allocation detection
- [x] UI — `resource-view.tsx` with team workload cards + project allocations

### Module 2 — KRA / KPA (Phase 2 — NEW)
- [x] KRA definitions with weight, target rating, cycle — API (`/api/kras`)
- [x] Status workflow: draft → self_review → manager_review → calibration → closed
- [x] Self + manager ratings + comments, with notifications on stage transitions
- [x] UI — `kra-view.tsx` with filterable list + detail dialog with sliders for ratings

### Module 5 — Budget & Financial Tracking (Phase 2 — NEW, INR only)
- [x] Project budgets (one per project, upsert semantics) — API (`/api/budgets`)
- [x] Expense logging with 8 categories + vendor + date — API (`/api/expenses`)
- [x] Budget vs actual visualisation, category breakdown
- [x] UI — `budget-view.tsx` with budget vs actual bars, category breakdown, expense log

### Hardening
- [x] **`403 Module Not Enabled` enforcement** — implemented in `src/lib/api-guard.ts` via `requireModule()`. All 11 module-scoped API routes use it. Disabled-module endpoints now return 403 with a helpful message, not 404. (PRD §4.5 ✅)
- [x] **Zod input validation** — `src/lib/schemas.ts` defines schemas for every create/update operation across all modules. `parseBody()` and `parseQuery()` helpers return 400 with field-level errors on invalid input. (PRD §3 risk: "API input validation" ✅)
- [x] **Tenant-isolation test suite** — `tests/tenant-isolation.test.ts` — 17 tests verifying (a) every multi-tenant table has `orgId`, (b) no cross-org data leaks, (c) audit log integrity, (d) notification routing, (e) cascade delete structure. All passing. (PRD §13 risk: "Multi-tenancy data leakage — Critical" mitigation ✅)
- [x] **Central notification service** — `src/lib/notify.ts` exposes `createNotification()` used by task assignment, leave application/approval, KRA stage transitions. (PRD §5.5 ✅)
- [x] **Audit helper** — `audit()` in `src/lib/api-guard.ts` standardises audit log creation across all routes

---

## 3. 🔧 Needs Fixing / Hardening

- [ ] **Dev-server compile timeout under Turbopack** — `bun run dev` compiles `/` in ~17s on this 4GB sandbox (was crashing silently before the dynamic-import refactor in `app-shell.tsx`). Production builds with `bun run build` not yet verified clean in this session. **Priority: high** — blocks browser verification of new views.
- [ ] **Auth** — still demo-org-only. No real login (email/password, OAuth, 2FA). NextAuth.js v4 is in `package.json` but not wired up. **Priority: high** for any real-user onboarding.
- [ ] **Production DB** — currently SQLite (MVP default). Needs PostgreSQL swap before real users.
- [ ] **Module-gate tests** — `tests/module-gate.test.ts` scaffolded (hits API endpoints to verify 403/400/200 behavior) but blocked by dev-server stability. Run manually once dev server is healthy.
- [ ] **Public API + webhooks** (PRD §4.5) — not started. Needs API key scoping, HMAC-signed webhooks, retry-with-backoff.
- [ ] **Slack/Teams integration** — not started.
- [ ] **CSV import wizard** (PRD §5) — not started. Jira/Asana/Trello/ClickUp field-mapping UI.

---

## 4. 🔜 Future / Not Started (per PRD roadmap)

### Phase 2 (remaining)
- [ ] Module 7 — Collaboration & Docs (docs only, chat deferred)
- [ ] Full public API + webhooks
- [ ] Slack/Microsoft Teams integration
- [ ] CSV import wizard for Jira/Asana/Trello/ClickUp

### Phase 3 (Scale)
- [ ] Module 6 — Risk & Issue Management
- [ ] Module 10 — Governance, Compliance & Audit (Enterprise add-on)
- [ ] Multi-currency + GST engine for Module 5 (currently INR-only)
- [ ] SAML/OIDC (Enterprise auth)
- [ ] Advanced cross-module BI widgets
- [ ] Native mobile app
- [ ] i18n beyond English

### Long-term (per PRD §16)
- [ ] AI integration — planned only after core modular product is stable with real usage data. Candidate features: task summarization, smart resource allocation, AI-assisted appraisal drafting (M2), natural-language task creation, chat-based room booking, budget anomaly detection. To be scoped in a dedicated AI-features PRD later.

---

## 5. File map (new/changed in this pass)

**New:**
- `src/lib/api-guard.ts` — `requireModule()`, `parseBody()`, `parseQuery()`, `withErrors()`, `audit()` middleware
- `src/lib/schemas.ts` — zod schemas for all 7 modules
- `src/lib/notify.ts` — central `createNotification()` helper (PRD §5.5)
- `src/app/api/leaves/route.ts` — Module 8 leave requests + approval
- `src/app/api/attendance/route.ts` — Module 8 check-in/check-out
- `src/app/api/holidays/route.ts` — Module 8 holiday calendar
- `src/app/api/allocations/route.ts` — Module 4 resource allocation
- `src/app/api/kras/route.ts` — Module 2 KRA lifecycle
- `src/app/api/budgets/route.ts` — Module 5 project budgets
- `src/app/api/expenses/route.ts` — Module 5 expense logging
- `src/components/nexus/leave-view.tsx` — Module 8 UI
- `src/components/nexus/resource-view.tsx` — Module 4 UI
- `src/components/nexus/kra-view.tsx` — Module 2 UI
- `src/components/nexus/budget-view.tsx` — Module 5 UI
- `tests/tenant-isolation.test.ts` — 17 passing tests
- `tests/module-gate.test.ts` — scaffolded, pending dev-server stability

**Changed:**
- `prisma/schema.prisma` — added `Leave`, `Attendance`, `Holiday`, `Allocation`, `Kra`, `Budget`, `Expense` models + `Organization`/`User`/`Project` relations
- `src/app/api/{projects,tasks,rooms,bookings,modules,onboarding,notifications,dashboard,export}/route.ts` — refactored to use `requireModule()` + `parseBody()` + `withErrors()` + `audit()`
- `src/app/api/dashboard/route.ts` — now aggregates KPIs from all 7 enabled modules
- `src/app/api/export/route.ts` — now exports Leave/Resource/KRA/Budget data
- `src/lib/seed.ts` — seeds demo data for all 7 modules; auto-enables Phase 2 modules in demo org
- `src/lib/store.ts` — `ViewKey` extended with `leave | resource | kra | budget`
- `src/components/nexus/sidebar.tsx` — surfaces all 7 modules in nav
- `src/components/nexus/app-shell.tsx` — lazy-loads new view components (dynamic imports to keep initial bundle small)
- `src/components/nexus/dashboard-view.tsx` — new Phase 2 KPI cards (pending leaves, over-allocated, KRAs pending review, budget used)
- `package.json` — added `test`, `test:tenant`, `test:gate` scripts

---

## 6. How this file gets updated

Every time Pranav asks for a project review, Claude will:
1. Re-audit the actual repo state via GitHub (files, commits, structure) — not assume from memory
2. Move items between ✅ Completed / 🔧 Needs Fixing / 🔜 Future based on what's verified
3. Update the "Last reviewed" date and snapshot summary table
4. Commit the updated file back to `status/PROJECT_STATUS.md`

---

*This file lives at `status/PROJECT_STATUS.md` — a dedicated folder so it's easy to find independent of `docs/` (which holds the PRD).*
