# Nexus Suite

All-in-one modular enterprise project management platform — tasks, KRA/KPA, room booking, resources, budget, and more, with toggleable modules. AI integration planned.

**Status:** Phase 1 MVP (in development per [PRD v2](docs/PRD.md))

## What's in this build

Per PRD §10 + Phase 2 additions:

**Phase 1 MVP:**
- **Core** — org, users, departments, RBAC roles, audit log, notifications, cross-module search
- **Module 1 (Tasks)** — projects, Kanban + list views, drag-and-drop status, priorities, types, assignees, due dates, estimates, task detail editor
- **Module 3 (Rooms)** — room inventory with amenities, week-view calendar, conflict-free booking, recurring bookings
- **Module 9 (Reporting)** — cross-module KPIs, status/priority/workload/room-utilisation charts, graceful hiding when modules disabled
- **Module Marketplace** — toggle all 10 PRD modules on/off
- **Onboarding wizard** — "What are you replacing?" → recommended bundle → confirm flow
- **Data Export** — per-module JSON/CSV export (anti-lock-in feature, PRD §5)
- **Audit Log** — last 100 events with actor + metadata

**Phase 2 (partial):**
- **Module 8 (Leave & Attendance)** — leave requests with approval workflow, attendance check-in/out, holiday calendar
- **Module 4 (Resource & Capacity)** — allocation %, per-user workload, over-allocation detection
- **Module 2 (KRA/KPA)** — KRA lifecycle (draft → self_review → manager_review → calibration → closed), self + manager ratings + comments
- **Module 5 (Budget)** — INR-only project budgets, expense logging with categories, budget vs actual dashboards

**Hardening:**
- `403 Module Not Enabled` enforcement on all module API routes (PRD §4.5)
- Zod input validation on all create/update operations
- Tenant-isolation test suite (17 tests, all passing) — PRD §13 risk mitigation
- Central notification service consumed by all modules (PRD §5.5)

## Tech stack

- Next.js 16 (App Router, Turbopack) + TypeScript 5
- Tailwind CSS 4 + shadcn/ui (New York)
- Prisma ORM + SQLite (MVP) — swap for PostgreSQL in production
- Zustand (client state) + TanStack Query (server state)
- Recharts (charts), dnd-kit (Kanban DnD), Framer Motion (onboarding)
- next-themes (dark mode), Sonner (toasts)

## Architecture: Modular Toggle System (PRD §2)

Every feature area is a self-contained module with its own DB schema, API routes, and UI section, sharing one core. Organizations activate only the modules they need.

- **Multi-tenancy:** Row-level (`orgId` on every table), not schema-per-tenant (PRD §2.4)
- **Module states:** `disabled | trial | active | archived`
- **Disabled modules:** data preserved, hidden everywhere, one-click re-enable
- **Disabled-module API endpoints:** return `403 Module Not Enabled` (PRD §4.5) — not yet enforced, scaffolded

## Getting started

```bash
# 1. Install deps
bun install

# 2. Set up the database
cp .env.example .env
bun run db:push

# 3. Run the dev server
bun run dev
```

Open http://localhost:3000 — the first session call seeds a demo org (Acme Design Studio) with 5 users, 3 projects, 12 tasks, 4 rooms, and 7 bookings.

## Module roadmap (per PRD §10)

| Phase | Modules |
|-------|---------|
| 1 (MVP, this repo) | Tasks, Rooms, Reporting, Core, Marketplace, Export, Onboarding |
| 2 (Post-MVP) | Leave (M8), Resource (M4), KRA/KPA (M2), Budget (M5, INR), Docs (M7), Slack/Teams, public API + webhooks |
| 3 (Scale) | Risk (M6), Governance (M10), multi-currency + GST, SAML/OIDC, advanced BI, native mobile |

## Pricing (PRD §6, toggle-based)

| Tier | Price | Included |
|------|-------|----------|
| Starter | ₹0 | Core + Tasks · 10 users · 14-day trial of 1 extra module |
| Growth | ₹299/user/mo | Core + any 3 modules + basic Reporting |
| Business | ₹599/user/mo | Core + any 6 modules + advanced BI |
| Enterprise | Custom | All modules + Governance + SSO + SLA |

## Project structure

```
prisma/schema.prisma         # Core + M1 + M3 models, row-level multi-tenancy
src/lib/
  modules.ts                 # Central module registry (single source of truth)
  store.ts                   # Zustand client store (session, modules, activeView)
  seed.ts                    # Idempotent demo org seeder
  api.ts                     # Fetch helper, date formatters
src/app/api/
  session/                   # Bootstrap session + ensure all modules registered
  modules/                   # Toggle module state (POST)
  onboarding/                # Complete onboarding wizard (POST)
  projects/  tasks/          # Module 1: CRUD
  rooms/     bookings/       # Module 3: CRUD + conflict prevention + recurrence
  dashboard/                 # Module 9: cross-module aggregates
  notifications/  audit/     # Core: notifications + audit log
  search/                    # Cross-module global search
  export/                    # Per-module JSON/CSV export
  team/                      # Users + departments
src/components/nexus/
  app-shell.tsx              # Layout: sidebar + topbar + view router
  sidebar.tsx  topbar.tsx    # Module-aware nav, global search, notifications
  onboarding-wizard.tsx      # 4-step wizard (welcome → replace → modules → confirm)
  dashboard-view.tsx         # KPI tiles + cross-module charts
  tasks-view.tsx             # Kanban + list with DnD, create/edit dialogs
  rooms-view.tsx             # Week calendar, room cards, booking dialog
  reporting-view.tsx         # Full BI dashboard with multiple chart types
  settings-view.tsx          # Module Marketplace with pricing tiers
  export-view.tsx            # Data export center
  audit-view.tsx             # Audit log stream
```

## License

See [LICENSE](LICENSE).
