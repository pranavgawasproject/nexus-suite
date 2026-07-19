# Nexus Suite — Project Status

> **This file is the single source of truth for "where things actually stand."**
> It gets updated every time the project is reviewed. Do not treat README.md or docs/PRD.md as the current-status source — this file is.

**Last reviewed:** 2026-07-19 (4th update, same day — open-core business model adopted, PRD v2.1)
**Reviewed by:** Claude (via Composio MCP, GitHub audit)
**Overall phase:** Phase 1 complete → Phase 2 modules + hardening landed → strategic pivot to open-core business model (PRD v2.1)

---

## 1. Snapshot Summary

| Metric | Value |
|---|---|
| Current phase | Phase 1 (done) + Phase 2 modules landed; business model reset to open-core (PRD §6, v2.1) |
| Modules live | 8 of 10 PRD modules have code: Core, Tasks, Rooms, Reporting, Marketplace, Leave, Resource, KRA/KPA, Budget |
| Modules pending | 6 (Risk), 7 (Collaboration), 10 (Governance UI — note: Governance is now free/open-source per v2.1, not Enterprise-only) |
| Business model | **Open-core (v2.1)** — all modules free & self-hostable forever; revenue only from Managed Cloud Hosting, Support SLAs, Compliance add-ons. Replaces the earlier per-module SaaS tier plan (PRD v2.0 §6, now superseded). |
| Stars / Forks / Watchers | 0 / 0 / 0 |
| Topics set on repo | 13 topics set |
| Repo | [github.com/pranavgawasproject/nexus-suite](https://github.com/pranavgawasproject/nexus-suite) (public, MIT) |
| Stack | Next.js 16, TypeScript 5, Tailwind 4 + shadcn/ui, Prisma + SQLite (MVP), Zustand + TanStack Query, Recharts, dnd-kit, Framer Motion |

---

## 2. ✅ Completed

### Core
- [x] Session bootstrap, RBAC roles, audit log (API + UI), notifications, cross-module search, team/org structure
- [x] Module Marketplace — toggle API + UI
- [x] Onboarding wizard — 4-step flow
- [x] Data export — per-module JSON/CSV
- [x] App shell — module-aware sidebar/topbar, dynamic imports
- [x] Row-level multi-tenancy (`orgId` on every table)
- [x] Demo seed data (idempotent), covers all 8 live modules
- [x] `403 Module Not Enabled` enforcement (PRD §4.5)
- [x] Zod input validation on all create/update routes
- [x] Tenant-isolation test suite — 17 tests (PRD §13 Critical risk mitigation)
- [x] Central notification service, standardised audit helper

### Modules
- [x] Module 1 (Tasks), Module 3 (Rooms), Module 9 (Reporting) — Phase 1, complete
- [x] Module 8 (Leave), Module 4 (Resource), Module 2 (KRA/KPA), Module 5 (Budget, INR) — Phase 2, complete

### Growth / Community
- [x] GitHub topics set (13 topics)
- [x] `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` added

### Strategy (NEW this cycle)
- [x] **Market research completed** on why enterprises pay premium for SaaS PM (Monday/Asana) and closed ERP (SAP/NetSuite) instead of open-source alternatives — findings: implementation friction, risk/liability transfer, and dedicated support are what's actually being paid for, not the software itself
- [x] **Open-core business model adopted** (PRD v2.1 §6) — all modules free/open-source forever; revenue from Managed Cloud Hosting + Support SLAs + Compliance add-ons only
- [x] **Competitive landscape mapped** against real open-source players: Odoo (~49.1k stars), ERPNext (~31.9k), NocoBase (~21.6k), Huly, Plane, Twenty, Dolibarr — documented in PRD §12.2. Identified gap: none combine PM+ERP in a genuinely per-module-toggle architecture the way Nexus Suite's PRD specifies.

---

## 3. 🔧 Needs Fixing / Hardening

- [ ] **Real auth** — still needs confirmation whether login is real or demo-org-only
- [ ] **Production DB** — still SQLite; PostgreSQL swap not yet done
- [ ] **Build/deploy verification** — `bun run build` clean-run not yet confirmed in a review cycle
- [ ] **CI pipeline** — no GitHub Actions workflow confirmed yet
- [ ] **Commit authorship is inconsistent** — some commits show as "Z User" / "Nexus Dev" rather than your GitHub identity
- [ ] **License decision needed (NEW, urgent)** — PRD §15 flags MIT vs AGPL as an open question. This needs deciding **before the first external contributor or fork**, since license changes later are legally painful. AGPL prevents competitors from re-hosting Nexus Suite as their own SaaS without contributing back — relevant given the open-core model now depends on Managed Cloud Hosting being a real revenue lever.
- [ ] **Self-host deployment kit does not exist yet (NEW, high priority)** — PRD v2.1 §3/§10 now marks Docker Compose + one-command installer as a Must-have, since the entire business model depends on self-hosting being genuinely easy. This is currently unbuilt.

---

## 4. 🔜 Future / Not Started

### Phase 2 remaining
- [ ] Module 7 — Collaboration & Docs
- [ ] Full public API + webhooks
- [ ] Slack/Microsoft Teams integration

### Phase 3 (Scale)
- [ ] Module 6 — Risk & Issue Management
- [ ] Module 10 — Governance UI (data model/logic can now ship free/open-source per v2.1, not Enterprise-gated)
- [ ] Multi-currency + GST engine for Module 5
- [ ] Advanced cross-module BI, native mobile app, i18n beyond English

### Long-term
- [ ] AI integration — per PRD v2.1 §16, ships in the free core, not gated

### Business model execution (NEW, per PRD v2.1 §6.5 sequencing)
- [ ] Step 1: Self-host deployment kit (Docker Compose + installer)
- [ ] Step 2: Build community trust/traction (growth goal, status Section 5)
- [ ] Step 3: Launch Managed Cloud Hosting — explicitly NOT before Step 2 has real evidence
- [ ] Step 4: Compliance/Enterprise add-ons — only once an actual prospect asks

---

## 5. 🏆 Growth Goal: #1 Open-Source AI + Project Management Repo

**Stated goal:** Make nexus-suite the most-starred, most-forked open-source "AI + Project Management" repo, and get accepted into GitHub Sponsors.

**Updated framing (v2.1):** the growth goal and the open-core business model are now the same strategy, not two separate things — stars/community traction ARE the sales funnel for Managed Cloud Hosting (Section 6.5 sequencing). Every item below still applies.

### 5.1 Repo hygiene
- [x] GitHub topics (13 set)
- [ ] Social preview image
- [ ] `FUNDING.yml` (once Sponsors approved)
- [ ] Enable GitHub Discussions
- [x] `CONTRIBUTING.md`
- [x] `CODE_OF_CONDUCT.md`
- [ ] Fix commit authorship consistency
- [ ] GitHub Actions CI badge
- [ ] **License file clarity (NEW)** — once MIT vs AGPL is decided (see Section 3), make sure LICENSE and README both clearly state it, since license ambiguity is a known blocker for enterprise self-host adoption

### 5.2 README as a marketing asset
- [ ] Hero section with screenshot/GIF
- [ ] "Why Nexus Suite" comparison table vs. Jira/Asana/Zoho One **and now also vs. Odoo/ERPNext** (per PRD §12.2 — open-source readers will compare you to these first, not to SAP)
- [ ] Live demo link
- [ ] Badges row
- [ ] Move deep architecture detail to `docs/ARCHITECTURE.md`
- [ ] **"Genuinely free" messaging (NEW)** — README should lead with "100% free and open-source, self-host forever" per the v2.1 wedge messaging (PRD §11), since this is now the core differentiator vs. Odoo/ERPNext (which are open-source but require heavy configuration) and vs. SaaS PM tools (which are not free)

### 5.3 Distribution
- [ ] Product Hunt, Hacker News "Show HN", r/selfhosted, r/opensource, r/SaaS, r/webdev
- [ ] Submit to awesome-selfhosted (CONTRIBUTING.md/CODE_OF_CONDUCT.md prerequisite now done ✓)
- [ ] Cross-post to Reddit/LinkedIn
- [ ] Position around "AI + PM" once AI ships

### 5.4 GitHub Sponsors
- [ ] Finish Sponsors application review
- [ ] `FUNDING.yml` once approved
- [ ] Sequencing: ship → traction → sponsors (unchanged)

### 5.5 Suggested realistic milestone sequence (revised v2.1)
1. Repo hygiene — in progress
2. **Self-host deployment kit** (NEW — must exist before any distribution push, since "self-host forever" is now the core pitch and needs to actually work)
3. README rewrite + public demo deploy
4. First distribution push
5. Managed Cloud Hosting launch (business model execution, Section 4)
6. Sponsors formalized

---

## 6. How this file gets updated

Every time Pranav asks for a project review, Claude will:
1. Re-audit the actual repo state via GitHub (files, commits, structure, stars/forks) — not assume from memory
2. Move items between ✅ Completed / 🔧 Needs Fixing / 🔜 Future based on what's verified
3. Update the "Last reviewed" date and snapshot summary table
4. Check off growth-goal items in Section 5 as they're completed
5. Commit the updated file back to `status/PROJECT_STATUS.md`

---

*This file lives at `status/PROJECT_STATUS.md`. See `docs/PRD.md` for the full product/business spec.*
