# Nexus Suite — Project Status

> **This file is the single source of truth for "where things actually stand."**

**Last reviewed:** 2026-08-02 (Phase 2 + competitor features shipped — AI insights, AI admin copilot, GitHub sync, custom fields)
**Reviewed by:** Claude (direct repo work)

## Track A (this run): AI insights + GitHub sync + custom fields + deploy polish

**Code files changed:** `src/lib/ai.ts`, `src/lib/github-sync.ts`, `src/app/api/ai/*`, `src/app/api/github-sync/*`, `src/app/api/custom-fields/*`, `prisma/schema.prisma`, `install.sh`, `CONTRIBUTING.md`

- **AI dashboard insights** (`POST /api/ai/dashboard-insights`) — heuristic + AI executive summary
- **AI admin copilot** (`POST /api/ai/admin-copilot`) — governance/compliance checks + KPI suggestions
- **Two-way GitHub sync** — `GitHubSync` + `GitHubIssueMap` models, `/api/github-sync` CRUD, webhook receiver with HMAC verification, outbound sync via GitHub API
- **Custom fields** (ERPNext DocTypes style) — `CustomFieldDef` + `CustomFieldValue` models, `/api/custom-fields` + `/api/custom-fields/values` CRUD, supports 8 field types
- **One-command installer** (`install.sh`) — `curl | bash` style, generates secrets, builds + starts Docker stack
- **Good first issues** section added to CONTRIBUTING.md (12 concrete scoped tasks for new contributors)

## ✅ Completed

- **AI integration (Phase 2 — DONE)**:
  - Natural-language task creation (`POST /api/ai/parse-task`)
  - Task summarization (`POST /api/ai/summarize-task`)
  - Budget anomaly detection (`POST /api/ai/budget-anomalies`)
  - **NEW: Dashboard insights (`POST /api/ai/dashboard-insights`)** — heuristic + AI executive summary
  - **NEW: Admin copilot (`POST /api/ai/admin-copilot`)** — governance/compliance checks + KPI suggestions
- **Two-way GitHub sync (competitor feature — DONE)**:
  - `GitHubSync` model — link a Nexus project to a GitHub repo
  - `GitHubIssueMap` model — bi-directional task ↔ issue mapping
  - Outbound sync (Nexus → GitHub) via GitHub REST API
  - Inbound sync (GitHub → Nexus) via webhook receiver with HMAC-SHA256 signature verification
  - Sync direction options: `two_way` | `one_way_out` | `one_way_in`
  - Status mapping + label mapping (configurable per sync)
  - API: `/api/github-sync` (CRUD), `/api/github-sync/webhook` (inbound receiver)
- **Custom fields / metadata-driven forms (competitor feature — DONE)**:
  - `CustomFieldDef` model — define custom fields per entity type (task, kra, risk, etc.)
  - `CustomFieldValue` model — store values per entity instance
  - 8 field types: text, number, date, select, multiselect, boolean, url, email
  - API: `/api/custom-fields` (CRUD for definitions), `/api/custom-fields/values` (upsert/list)
  - Lets self-hosters extend modules without forking code (ERPNext DocTypes pattern)
- **One-command installer** (`install.sh`) — `curl -fsSL ... | bash` style
- **Good first issues** — 12 concrete tasks documented in CONTRIBUTING.md
- **All 10 PRD modules** — full depth (cycles, retros, comments, milestones, dependencies, checklists, worklogs, Gantt, subtasks, CSV import)
- **Public API v1** — 28+ endpoint groups with API-key auth + scopes + 403 module gates
- **Webhooks** — HMAC-signed, 5-retry exponential backoff, in-process scheduler via `instrumentation.ts`
- **Self-host kit** — Dockerfile + docker-compose (SQLite + Postgres) + `install.sh` + docs
- **CI** — GitHub Actions stable and green (lint, typecheck, all tests, Docker build)
- **Verification** — `typecheck` ✅, `lint` ✅, `build` ✅ (21s), `test:tenant` 17/17 ✅
- **License** — AGPL-3.0-or-later (prevents SaaS re-host)
- **Open-core business model** (PRD v2.1 §6) — all modules free forever

## 🔧 Needs Fixing
- (none critical — CI matrix covers tenant, gate, csv, cycles, retros, comments, milestones, dependencies, checklists, worklogs tests)
- GitHub sync outbound requires `GITHUB_SYNC_PAT` env var (known limitation — documented in `src/lib/github-sync.ts`)
- Custom fields UI not yet built (API + schema ready; UI is a good first issue)
- After schema change: run `bun run db:push` locally / in deploy

## 🚀 Future Plan

**Vision:** Become the #1 most-starred, most-forked open-source AI + ERP/PM platform on GitHub, and get accepted into GitHub Sponsors.

### Phase 1 — Core Product (COMPLETE ✅)
- [x] All 10 PRD modules — full depth
- [x] Public API v1 — 28+ endpoint groups
- [x] CSV import wizard
- [x] Full CI — stable and green
- [x] Self-host deploy kit (Dockerfile + docker-compose + install.sh)
- [x] Cycles/Sprints, Retrospectives, Milestones, Dependencies, Gantt, Checklists, Worklogs

### Phase 2 — AI Integration (COMPLETE ✅)
- [x] AI-assisted task/project creation and summarization
- [x] AI-powered reporting & analytics insights (dashboard insights)
- [x] AI copilot for admins (governance/compliance checks, KPI suggestions)

### Phase 3 — Growth & Community (NOT STARTED)
- [ ] Public launch push (Reddit, HN, Product Hunt, dev communities)
- [ ] Polished README, demo video/GIFs, live demo instance
- [ ] Complete GitHub Sponsors 2FA verification and get accepted
- [ ] Grow contributor base — good first issues (12 documented in CONTRIBUTING.md ✓), outreach
- [ ] Target: become the top-starred open-source "AI + ERP/Project Management" repo on GitHub

### Phase 4 — Monetization (open-core) (NOT STARTED)
- [ ] Managed hosting offering
- [ ] Support SLAs
- [ ] Compliance add-ons

## 🏆 Competitor-Inspired Features (Future)

> Researched from top open-source PM/ERP repos (Plane, Huly, ERPNext, OpenProject, Leantime, Focalboard)

- [x] **Sprints / Cycles API + UI** (Plane)
- [x] **Sprint retrospectives API + UI** (Leantime)
- [x] **Project Milestones API + UI** (Plane / OpenProject)
- [x] **Task dependencies API + UI** (OpenProject)
- [x] **Gantt / timeline view** (OpenProject)
- [x] **Task checklists** (Plane / Trello)
- [x] **Task worklogs / time tracking** (OpenProject / Plane)
- [x] **Two-way GitHub sync** (Huly & Plane) — DONE
- [x] **Custom fields / metadata-driven forms** (ERPNext DocTypes) — DONE
- [ ] **Real-time collaborative Wiki/Docs** (Plane & Huly) — upgrade `docs-view.tsx` to Yjs/CRDT-based collaborative editing

**Suggested build priority:** Real-time Wiki upgrade → public launch push → managed hosting.
