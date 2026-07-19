# Nexus Suite — Project Status

> **This file is the single source of truth for "where things actually stand."**
> It gets updated every time the project is reviewed. Do not treat README.md or docs/PRD.md as the current-status source — this file is.

**Last reviewed:** 2026-07-19 (2nd review, same day — Phase 2 landed between reviews)
**Reviewed by:** Claude (via Composio MCP, GitHub audit)
**Overall phase:** Phase 1 complete → Phase 2 modules + hardening landed — not yet production-hardened, zero community traction yet

---

## 1. Snapshot Summary

| Metric | Value |
|---|---|
| Current phase | Phase 1 (done) + Phase 2 modules landed (per PRD §10) |
| Modules live | Core, Module 1 (Tasks), Module 3 (Rooms), Module 9 (Reporting), Module Marketplace, Module 8 (Leave), Module 4 (Resource), Module 2 (KRA/KPA), Module 5 (Budget, INR) — **8 of 10 PRD modules now have code** |
| Modules pending | 6 (Risk), 7 (Collaboration), 10 (Governance) — Phase 3 |
| Stars / Forks / Watchers | 0 / 0 / 0 (just made public, no promotion yet) |
| Topics set on repo | None yet |
| Repo | [github.com/pranavgawasproject/nexus-suite](https://github.com/pranavgawasproject/nexus-suite) (public, MIT) |
| Stack | Next.js 16 (App Router, Turbopack), TypeScript 5, Tailwind 4 + shadcn/ui, Prisma + SQLite (MVP), Zustand + TanStack Query, Recharts, dnd-kit, Framer Motion |

---

## 2. ✅ Completed

### Core
- [x] Session bootstrap, RBAC roles, audit log (API + UI), notifications, cross-module search, team/org structure
- [x] Module Marketplace — toggle API + UI with pricing tiers
- [x] Onboarding wizard — 4-step flow
- [x] Data export — per-module JSON/CSV
- [x] App shell — module-aware sidebar/topbar, **dynamic imports for all views** (keeps initial bundle small, avoids Turbopack compile timeouts)
- [x] Row-level multi-tenancy (`orgId` on every table)
- [x] Demo seed data (idempotent), now covers all 8 live modules
- [x] **`403 Module Not Enabled` enforcement** — now live via `requireModule()` middleware on all 11 module-scoped routes (PRD §4.5) — previously flagged as scaffolded-only, now fixed
- [x] **Zod input validation** — `parseBody()` / `parseQuery()` helpers on all create/update routes, 400 + field errors on bad input
- [x] **Tenant-isolation test suite** — `tests/tenant-isolation.test.ts`, 17 tests covering orgId coverage, cross-org leak prevention, audit/notification integrity, cascade-delete structure. This directly addresses the "Critical" multi-tenancy risk flagged in PRD §13.
- [x] Central notification service (`src/lib/notify.ts`) consumed by all module routes (PRD §5.5)
- [x] Standardised audit helper (`src/lib/api-guard.ts`)

### Module 1 — Tasks & Projects — complete (Phase 1)
### Module 3 — Rooms & Booking — complete (Phase 1)
### Module 9 — Reporting — complete (Phase 1), now shows Phase 2 KPI cards too

### Module 8 — Leave & Attendance (NEW)
- [x] Leave requests with approval workflow, attendance check-in/out, holiday calendar
- [x] UI view + seeded with 5 leave requests, 15 attendance records, 4 holidays

### Module 4 — Resource & Capacity (NEW)
- [x] Allocation CRUD, per-user workload, over-allocation detection
- [x] UI view + seeded with 8 allocations

### Module 2 — KRA/KPA (NEW)
- [x] Full KRA lifecycle: draft → self_review → manager_review → calibration → closed
- [x] Self + manager ratings and comments
- [x] UI view + seeded with 7 KRAs

### Module 5 — Budget (NEW, INR only — per Phase 2 scope)
- [x] Project budgets, expense logging (8 categories), budget vs actual charts
- [x] UI view + seeded with 3 budgets, 7 expenses

---

## 3. 🔧 Needs Fixing / Hardening

- [ ] **Real auth** — still needs confirmation whether login is real or demo-org-only
- [ ] **Production DB** — still SQLite; PostgreSQL swap not yet done
- [ ] **Build/deploy verification** — `bun run build` clean-run not yet confirmed in a review cycle; also verify Turbopack timeout concern mentioned in the Phase 2 commit is actually resolved by the dynamic imports
- [ ] **CI pipeline** — no GitHub Actions workflow confirmed yet (lint/test/build on PR) — needed both for code quality AND for looking credible to contributors/stargazers
- [ ] **Commit authorship is inconsistent** — some commits show as "Z User" / "Nexus Dev" (generic/bot-like identities) rather than your GitHub identity. For a repo you want to be known for, recommend future commits use your real GitHub-linked commit email so contribution graph and commit history look authentic to visitors evaluating the project

---

## 4. 🔜 Future / Not Started (per PRD roadmap)

### Phase 2 remaining
- [ ] Module 7 — Collaboration & Docs (docs only, chat deferred)
- [ ] Full public API + webhooks (PRD §4.5)
- [ ] Slack/Microsoft Teams integration

### Phase 3 (Scale)
- [ ] Module 6 — Risk & Issue Management
- [ ] Module 10 — Governance, Compliance & Audit (Enterprise add-on)
- [ ] Multi-currency + GST engine for Module 5
- [ ] SAML/OIDC, advanced cross-module BI, native mobile app, i18n beyond English

### Long-term
- [ ] AI integration (PRD §16) — after core product is stable with real usage

---

## 5. 🏆 Growth Goal: #1 Open-Source AI + Project Management Repo

**Stated goal:** Make nexus-suite the most-starred, most-forked open-source "AI + Project Management" repo, and get accepted into GitHub Sponsors.

This is a marketing/community-building goal, not a code goal — it requires different work than shipping modules. Being realistic: this is a highly competitive category (OpenProject, Plane, Focalboard, Huly, Tracker-like tools already have thousands of stars). Winning "#1" outright is a stretch goal; the achievable version is **building genuine traction and a credible, well-loved project** — stars follow from that, not the other way around.

### 5.1 Repo hygiene (do first — low effort, high credibility impact)
- [ ] Add GitHub **topics**: `project-management`, `open-source`, `saas`, `nextjs`, `typescript`, `ai`, `enterprise`, `modular`, `self-hosted` — topics are how people discover repos via GitHub Explore/search. Currently **zero topics set**.
- [ ] Add a **social preview image** (Settings → Social preview) — this is what shows on Twitter/LinkedIn/Reddit link shares; a plain repo card gets ignored
- [ ] Add **`FUNDING.yml`** (`.github/FUNDING.yml`) with `github: [pranavgawasproject]` once your Sponsors profile is approved — this is what puts the "Sponsor" button directly on the repo page
- [ ] Enable **GitHub Discussions** (currently disabled) — signals an active community space, needed before you have real users asking questions
- [ ] Add **CONTRIBUTING.md** — lower the barrier for first-time contributors (setup steps already in README, but a dedicated file with "good first issue" guidance converts browsers into contributors)
- [ ] Add **CODE_OF_CONDUCT.md** — expected by serious contributors and by "awesome-list" curators before they'll list a repo
- [ ] Fix commit authorship consistency (see Section 3)
- [ ] Add a proper **GitHub Actions CI badge** to README (build/lint/test status) — green badges build trust instantly

### 5.2 README as a marketing asset
Current README is good technical documentation but reads like internal docs, not a landing page for strangers. For a star-generating README, add:
- [ ] **Hero section**: 1-line pitch + a GIF/screenshot showing the Kanban board or dashboard in action (screenshots convert browsers to stargazers more than any text)
- [ ] **"Why Nexus Suite" comparison table** vs. Jira/Asana/Zoho One — reuse PRD §12 competitive analysis, but written for outside readers, not internal planning
- [ ] **Live demo link** (deploy the seeded demo org somewhere public — Vercel free tier works for a SQLite demo) so people can click and try before installing
- [ ] **Badges row**: license, stars, build status, "PRs welcome"
- [ ] Move the deep architecture detail (project structure tree, etc.) into `docs/ARCHITECTURE.md` and keep README focused on "what is this / why should I care / how do I try it in 60 seconds"

### 5.3 Distribution (this is what actually drives stars — hygiene alone won't)
- [ ] Launch on **Product Hunt** once there's a working public demo (per PRD §11 GTM plan)
- [ ] Post on **Hacker News "Show HN"** — open-source self-hosted tools do well here specifically
- [ ] Post on **r/selfhosted, r/opensource, r/SaaS, r/webdev** — self-hosted PM tools are a recurring popular topic on r/selfhosted specifically
- [ ] Submit to **awesome-selfhosted** and similar curated "awesome lists" — durable, ongoing discovery source (requires CONTRIBUTING.md/CODE_OF_CONDUCT.md first, many lists check for these)
- [ ] Cross-post build-in-public updates to your existing Reddit accounts (per memory: Early_Resolution6932 / RopeRevolutionary532) and LinkedIn
- [ ] Once AI features ship (PRD §16), specifically position launch posts around "AI + PM" framing — that's a less crowded niche than generic PM tools and matches the stated goal

### 5.4 GitHub Sponsors
- [ ] Finish Sponsors application review (in progress per earlier conversation — requires 2FA, verified email, bank/tax info)
- [ ] Once approved: add `FUNDING.yml` (see 5.1), write a clear "why sponsor this" section (what funding unlocks — e.g. faster Phase 3 modules, hosting for the public demo)
- [ ] Sponsorship follows traction, not the other way around — realistic sequencing is: ship AI features → get real users/stars → sponsors follow. Very few sponsors fund a 0-star repo.

### 5.5 Suggested realistic milestone sequence
1. Repo hygiene (5.1) — can do this week, low effort
2. README rewrite + public demo deploy (5.2) — needed before any distribution push, since traffic without a good landing page/demo wastes the launch moment
3. First distribution push (5.3) — do this ONCE the above is ready, not before (you only get one good first-impression launch on HN/PH)
4. Sponsors formalized (5.4) — after initial traction exists

---

## 6. How this file gets updated

Every time Pranav asks for a project review, Claude will:
1. Re-audit the actual repo state via GitHub (files, commits, structure, stars/forks) — not assume from memory
2. Move items between ✅ Completed / 🔧 Needs Fixing / 🔜 Future based on what's verified
3. Update the "Last reviewed" date and snapshot summary table (including stars/forks/watchers so growth progress is trackable over time)
4. Check off growth-goal items in Section 5 as they're completed
5. Commit the updated file back to `status/PROJECT_STATUS.md`

---

*This file lives at `status/PROJECT_STATUS.md` — a dedicated folder so it's easy to find independent of `docs/` (which holds the PRD).*
