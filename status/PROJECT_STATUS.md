# Nexus Suite — Project Status

> **This file is the single source of truth for "where things actually stand."**
> It gets updated every time the project is reviewed. Do not treat README.md or docs/PRD.md as the current-status source — this file is.

**Last reviewed:** 2026-07-19
**Reviewed by:** Claude (via Composio MCP, GitHub audit)
**Overall phase:** Phase 1 MVP — scaffolded and mostly functional, not yet production-hardened

---

## 1. Snapshot Summary

| Metric | Value |
|---|---|
| Current phase | Phase 1 MVP (per PRD §10) |
| Modules live | Core, Module 1 (Tasks), Module 3 (Rooms), Module 9 (Reporting), Module Marketplace |
| Modules pending | 2 (KRA/KPA), 4 (Resource), 5 (Budget), 6 (Risk), 7 (Collaboration), 8 (Leave), 10 (Governance) |

| Repo | [github.com/pranavgawasproject/nexus-suite](https://github.com/pranavgawasproject/nexus-suite) (public) |
| Stack | Next.js 16 (App Router, Turbopack), TypeScript 5, Tailwind 4 + shadcn/ui, Prisma + SQLite (MVP), Zustand + TanStack Query, Recharts, dnd-kit, Framer Motion |

---

## 2. ✅ Completed

### Core
- [x] Session bootstrap (`/api/session`) — ensures modules registered per org
- [x] RBAC roles (Admin/Manager/Employee/Guest structure present in schema)
- [x] Audit log — API (`/api/audit`) + UI (`audit-view.tsx`) — last 100 events with actor + metadata
- [x] Notifications — API (`/api/notifications`) scaffolded
- [x] Cross-module global search — API (`/api/search`)
- [x] Team/org structure — API (`/api/team`) — users + departments
- [x] Module Marketplace — API (`/api/modules`, toggle POST) + UI (`settings-view.tsx`) with pricing tiers
- [x] Onboarding wizard — full 4-step flow (welcome → replace → modules → confirm), `onboarding-wizard.tsx`
- [x] Data export — per-module JSON/CSV, API (`/api/export`) + UI (`export-view.tsx`)
- [x] App shell — `app-shell.tsx`, module-aware `sidebar.tsx`, `topbar.tsx`
- [x] Multi-tenancy — row-level (`orgId` on every table) implemented in `prisma/schema.prisma`, matches PRD §2.4 decision
- [x] Demo seed data — idempotent seeder (`src/lib/seed.ts`), seeds "Acme Design Studio" demo org (5 users, 3 projects, 12 tasks, 4 rooms, 7 bookings)

### Module 1 — Tasks & Projects
- [x] Projects + Tasks CRUD — API (`/api/projects`, `/api/tasks`)
- [x] Kanban + list views, drag-and-drop status — `tasks-view.tsx` (largest view file, most built-out)
- [x] Priorities, types, assignees, due dates, estimates, task detail editor

### Module 3 — Meeting Room & Resource Booking
- [x] Room inventory with amenities — API (`/api/rooms`)
- [x] Bookings CRUD with conflict prevention + recurrence — API (`/api/bookings`)
- [x] Week-view calendar UI — `rooms-view.tsx` (second-largest view file)

### Module 9 — Reporting & Analytics
- [x] Cross-module KPI aggregation — API (`/api/dashboard`)
- [x] Full BI dashboard with multiple chart types (status/priority/workload/room-utilisation) — `reporting-view.tsx`
- [x] Graceful hiding of widgets for disabled modules

---

## 3. 🔧 Needs Fixing / Hardening

- [ ] **`403 Module Not Enabled` enforcement** — README explicitly states this is *"not yet enforced, scaffolded"* for disabled-module API endpoints (PRD §4.5 requirement). This is core to the toggle architecture actually being safe — a disabled module's API should genuinely reject calls, not just hide the UI. **Priority: high.**
- [ ] **Auth** — no confirmation yet that real auth (vs. session/demo bootstrap) is wired up. Needs verification: is there real login, or is it still demo-org-only?
- [ ] **Production DB** — currently SQLite (MVP default per README); PRD NFRs assume this gets swapped to PostgreSQL before real users are onboarded
- [ ] **Automated tests** — no test suite confirmed yet (unit/integration/tenant-isolation tests per PRD §13 risk register — "Multi-tenancy security bugs" is flagged as Critical impact in the PRD risk table, and mitigation requires automated tenant-isolation tests before each release)
- [ ] **Build/deploy verification** — `bun run dev` / `bun run build` not yet confirmed clean in this review cycle
- [ ] **API input validation** — not yet confirmed whether routes have schema validation (e.g. zod) on request bodies

---

## 4. 🔜 Future / Not Started (per PRD roadmap)

### Phase 2 (Post-MVP)
- [ ] Module 8 — Leave & Attendance
- [ ] Module 4 — Resource & Capacity Management (depends on Module 8 for full value)
- [ ] Module 2 — KRA/KPA & Performance Management (basic version, no calibration/skip-level yet)
- [ ] Module 5 — Budget & Financial Tracking (INR only, no multi-currency yet)
- [ ] Module 7 — Collaboration & Docs (docs only, chat deferred)
- [ ] Full public API + webhooks (PRD §4.5)
- [ ] Slack/Microsoft Teams integration

### Phase 3 (Scale)
- [ ] Module 6 — Risk & Issue Management
- [ ] Module 10 — Governance, Compliance & Audit (Enterprise add-on)
- [ ] Multi-currency + GST engine for Module 5
- [ ] SAML/OIDC (Enterprise auth)
- [ ] Advanced cross-module BI widgets
- [ ] Native mobile app
- [ ] i18n beyond English

### Long-term (per PRD §16)
- [ ] AI integration — planned only after core modular product is stable with real usage data. Candidate features: task summarization, smart resource allocation, AI-assisted appraisal drafting (M2), natural-language task creation, chat-based room booking, budget anomaly detection. To be scoped in a dedicated AI-features PRD later.

---

## 5. How this file gets updated

Every time Pranav asks for a project review, Claude will:
1. Re-audit the actual repo state via GitHub (files, commits, structure) — not assume from memory
2. Move items between ✅ Completed / 🔧 Needs Fixing / 🔜 Future based on what's verified
3. Update the "Last reviewed" date and snapshot summary table
4. Commit the updated file back to `status/PROJECT_STATUS.md`

---

*This file lives at `status/PROJECT_STATUS.md` — a dedicated folder so it's easy to find independent of `docs/` (which holds the PRD).*
