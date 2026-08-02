# Nexus Suite — Project Status

> **This file is the single source of truth for "where things actually stand."**

**Last reviewed:** 2026-08-02 (Phase 2 complete + Future Roadmap updated)
**Reviewed by:** Gemini Spark / Pranav Gawas

## Track A: AI insights + GitHub sync + custom fields + deploy polish

**Code files changed:** `src/lib/ai.ts`, `src/lib/github-sync.ts`, `src/app/api/ai/*`, `src/app/api/github-sync/*`, `src/app/api/custom-fields/*`, `prisma/schema.prisma`, `install.sh`, `CONTRIBUTING.md`

- **AI dashboard insights** (`POST /api/ai/dashboard-insights`) — heuristic + AI executive summary
- **AI admin copilot** (`POST /api/ai/admin-copilot`) — governance/compliance checks + KPI suggestions
- **Two-way GitHub sync** — `GitHubSync` + `GitHubIssueMap` models, `/api/github-sync` CRUD, webhook receiver with HMAC verification, outbound sync via GitHub API
- **Custom fields** (ERPNext DocTypes style) — `CustomFieldDef` + `CustomFieldValue` models, `/api/custom-fields` + `/api/custom-fields/values` CRUD, supports 8 field types
- **One-command installer** (`install.sh`) — `curl | bash` style, generates secrets, builds + starts Docker stack
- **Good first issues** section added to CONTRIBUTING.md (12 concrete scoped tasks for new contributors)

## ✅ Completed

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

## 🔧 Active Work & Next Priorities

- **Live Demo Instance** — Deploy auto-resetting demo instance (e.g. `demo.nexussuite.org`)
- **Visual README** — Add high-res screenshots and feature GIFs
- **Documentation site** — Build dedicated docs site (Starlight/Fumadocs/Mintlify)
- **Real-time collaborative Wiki/Docs** — Upgrade docs-view to Yjs/CRDT-based collaborative editing

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
- [ ] Deploy a live 1-click interactive demo instance (e.g., `demo.nexussuite.org`)
- [ ] Upgrade README with rich feature GIFs and screenshots
- [ ] Build dedicated documentation site (Starlight/Fumadocs/Mintlify)

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

**Suggested build priority:** Real-time Wiki upgrade → Live Demo → Visual README → Documentation site → Public Launch Push.
