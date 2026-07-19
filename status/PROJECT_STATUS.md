# Nexus Suite — Project Status

> **This file is the single source of truth for "where things actually stand."**
> It gets updated every time the project is reviewed. Do not treat README.md or docs/PRD.md as the current-status source — this file is.

**Last reviewed:** 2026-07-19 (5th update — open-core hardening pass: AGPL, self-host kit, CI, real auth, public API v1, webhooks, Module 7 docs)
**Reviewed by:** Claude (direct repo work)
**Overall phase:** Phase 1 + Phase 2 (modules + hardening) + open-core execution step 1 (self-host kit) all landed. Phase 3 + AI integration pending.

---

## 1. Snapshot Summary

| Metric | Value |
|---|---|
| Current phase | Phase 1 ✅ + Phase 2 (8/10 modules live) ✅ + open-core step 1 (self-host kit) ✅ |
| Modules live | Core, Tasks, Rooms, Reporting, Leave, Resource, KRA/KPA, Budget, **Docs (Module 7 partial)** |
| Modules pending | Risk (M6), Governance UI (M10) — Phase 3 |
| Business model | Open-core (PRD v2.1 §6) — all modules free/AGPL forever; revenue from Managed Cloud Hosting + Support + Compliance only |
| License | **AGPL-3.0-or-later** (chosen over MIT to prevent SaaS re-host — see [PRD §15](docs/PRD.md)) |
| API | Public REST `/api/v1/*` with API-key auth (read/write/webhooks scopes) + HMAC-signed webhooks with retry |
| Tests | 17 tenant-isolation tests passing (`bun run test:tenant`) |
| CI | GitHub Actions: lint → typecheck → tenant tests → build → Docker image build (`.github/workflows/ci.yml`) |
| Self-host | `docker compose up -d --build` → http://localhost:3000 — see [`docs/SELF_HOSTING.md`](docs/SELF_HOSTING.md) |
| Stars / Forks / Watchers | 0 / 0 / 0 |
| Repo | [github.com/pranavgawasproject/nexus-suite](https://github.com/pranavgawasproject/nexus-suite) (public, AGPL-3.0) |
| Stack | Next.js 16, TypeScript 5, Tailwind 4 + shadcn/ui, Prisma + SQLite/PostgreSQL, NextAuth.js v4, zod, Zustand, TanStack Query, Recharts, dnd-kit, Framer Motion |

---

## 2. ✅ Completed

### Core
- [x] Session bootstrap, RBAC roles, audit log (API + UI), notifications, cross-module search, team/org structure
- [x] Module Marketplace — toggle API + UI
- [x] Onboarding wizard — 4-step flow
- [x] Data export — per-module JSON/CSV (now covers all 8 live modules)
- [x] App shell — module-aware sidebar/topbar, dynamic imports
- [x] Row-level multi-tenancy (`orgId` on every table)
- [x] Demo seed data (idempotent), covers all 9 live modules (now includes 3 wiki docs)
- [x] `403 Module Not Enabled` enforcement (PRD §4.5)
- [x] Zod input validation on all create/update routes
- [x] Tenant-isolation test suite — 17 tests (PRD §13 Critical risk mitigation)
- [x] Central notification service, standardised audit helper

### Modules
- [x] Module 1 (Tasks), Module 3 (Rooms), Module 9 (Reporting) — Phase 1
- [x] Module 8 (Leave), Module 4 (Resource), Module 2 (KRA/KPA), Module 5 (Budget, INR) — Phase 2
- [x] **Module 7 (Docs & Wiki) — NEW this cycle** — markdown docs with versioning, nested pages, public/guest flag, in-line editor

### Auth & API (NEW this cycle)
- [x] **NextAuth.js v4 wired up** — Credentials provider, JWT sessions, bcrypt-hashed passwords. Demo fallback: magic password `"demo"` works for any user without a passwordHash (preserves frictionless demo flow).
- [x] **Public API v1** with API-key auth + scopes (read/write/webhooks) — `/api/v1/me`, `/api/v1/tasks` (GET/POST), `/api/v1/projects` (GET), `/api/v1/rooms` (GET), `/api/v1/bookings` (GET/POST with conflict check)
- [x] **API key management** — create/revoke keys, scopes, expiry, last-used tracking, demo auto-provisioned key for instant testing
- [x] **Webhooks** — HMAC-SHA256 signed delivery, 5-retry exponential backoff (1m, 5m, 25m, 2h, 10h), 15+ event types, prefix filtering (`task.*`), retry endpoint designed for cron

### Self-host deployment kit (NEW this cycle — PRD §3 v2.1 Must-have)
- [x] **`Dockerfile`** — multi-stage build (deps → builder → runner), Prisma client bundled, runs as non-root user, healthcheck, `prisma db push` on boot
- [x] **`docker-compose.yml`** — two profiles: SQLite (single container, zero config) and PostgreSQL (with nightly backup sidecar, 30-day retention)
- [x] **`.dockerignore`** — keeps image small (excludes node_modules, .next, dev logs, nexus-suite clone, etc.)
- [x] **`docs/SELF_HOSTING.md`** — quickstart (2 min), production setup (Postgres + backups + reverse proxy), env var reference, troubleshooting

### CI / Build verification (NEW this cycle)
- [x] **GitHub Actions CI** (`.github/workflows/ci.yml`) — 5 jobs: lint, typecheck, tenant tests, build, Docker image build. Caches bun deps + Next.js cache. Runs on every push to main and every PR.
- [x] **`bun run typecheck`** script added (`tsc --noEmit`)

### Growth / Community
- [x] GitHub topics set (13 topics)
- [x] `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`
- [x] **Social preview image** (`public/social-preview.png`, 1280×640, generated via `scripts/gen-social-preview.py`)
- [x] **FUNDING.yml placeholder** added (`.github/FUNDING.yml`) — uncommented until Sponsors approved
- [x] **README rewritten as marketing asset** — hero image, badges, comparison table vs Monday/Asana/Jira AND vs Odoo/ERPNext, "genuinely free" messaging per PRD §11 wedge
- [x] **API docs** (`docs/API.md`) — full endpoint reference, webhook signature verification example, rate limit policy
- [x] **Commit authorship fixed** — git config now uses `pranavgawasproject` identity (not "Z User" / "Nexus Dev")
- [x] **License decision made: AGPL-3.0** — resolved [PRD §15](docs/PRD.md) open question

### Strategy
- [x] Market research completed (PRD §12)
- [x] Open-core business model adopted (PRD v2.1 §6)
- [x] Competitive landscape mapped against Odoo, ERPNext, NocoBase, Huly, Plane, Twenty, Dolibarr

---

## 3. 🔧 Needs Fixing / Hardening

- [ ] **Module-gate tests** (`tests/module-gate.test.ts`) — scaffolded but still blocked by dev-server stability on the 4GB sandbox. Once CI runners run them, will catch regressions on the 403/400/200 behavior.
- [ ] **Production DB verification** — schema supports PostgreSQL (`DATABASE_URL` env-driven) and Docker Compose ships a Postgres profile, but real-world Postgres smoke test not yet performed. Self-hosting guide documents the path.
- [ ] **Sign-in UI** — NextAuth.js is wired up with Credentials provider, but there's no custom sign-in page yet (using default NextAuth page which isn't reachable in sandbox single-route mode). Build a sign-in modal that lives inside the app shell.
- [ ] **Webhook retry cron** — `POST /api/webhooks/retry` endpoint exists and works, but needs a cron job to actually call it every minute. Documented in `docs/API.md` for self-hosters; managed-hosting tier gets a scheduled Lambda.
- [ ] **Per-module mute controls / quiet hours** for notifications (PRD §5.5) — not yet built
- [ ] **CSV import wizard** (PRD §5) — not started. Jira/Asana/Trello/ClickUp field-mapping UI.
- [ ] **Slack/Microsoft Teams integration** (PRD §4.5 native integrations priority #1) — not started

---

## 4. 🔜 Future / Not Started (per PRD roadmap)

### Phase 2 remaining
- [ ] Slack/Microsoft Teams integration (now blocked on app approval from Slack/MS)
- [ ] CSV import wizard (Jira/Asana/Trello/ClickUp field-mapping UI)

### Phase 3 (Scale)
- [ ] Module 6 — Risk & Issue Management
- [ ] Module 10 — Governance UI (data model/logic ships free per v2.1; UI not built)
- [ ] Multi-currency + GST engine for Module 5 (currently INR-only)
- [ ] SAML/OIDC (Enterprise auth — now core per v2.1, not Enterprise-gated)
- [ ] Advanced cross-module BI widgets
- [ ] Native mobile app
- [ ] i18n beyond English

### Long-term (per PRD §16)
- [ ] AI integration — ships in the free core per v2.1. Candidates: task summarization, smart resource allocation, AI-assisted appraisal drafting, NL task creation, chat-based room booking, budget anomaly detection.

### Business model execution (per PRD v2.1 §6.5 sequencing)
- [x] Step 1: Self-host deployment kit (DONE — `Dockerfile` + `docker-compose.yml` + `docs/SELF_HOSTING.md`)
- [ ] Step 2: Build community trust/traction (growth goal — see Section 5)
- [ ] Step 3: Launch Managed Cloud Hosting — explicitly NOT before Step 2 has real evidence
- [ ] Step 4: Compliance/Enterprise add-ons — only once an actual prospect asks

---

## 5. 🏆 Growth Goal: #1 Open-Source AI + Project Management Repo

**Stated goal:** Make nexus-suite the most-starred, most-forked open-source "AI + Project Management" repo, and get accepted into GitHub Sponsors.

**Framing (v2.1):** growth goal and open-core business model are the same strategy — stars/community traction ARE the sales funnel for Managed Cloud Hosting.

### 5.1 Repo hygiene
- [x] GitHub topics (13 set)
- [x] Social preview image (`public/social-preview.png`)
- [x] `FUNDING.yml` placeholder (`.github/FUNDING.yml` — uncommented until Sponsors approved)
- [ ] Enable GitHub Discussions
- [x] `CONTRIBUTING.md`
- [x] `CODE_OF_CONDUCT.md`
- [x] Fix commit authorship consistency (now uses `pranavgawasproject` identity)
- [x] GitHub Actions CI badge (in README)
- [x] **License clarity** — AGPL-3.0 stated in LICENSE, README badge, and package.json `license` field

### 5.2 README as marketing asset
- [x] Hero section with social preview image
- [x] "Why Nexus Suite" comparison table vs Jira/Asana AND vs Odoo/ERPNext (PRD §12.2)
- [x] "Genuinely free" messaging leads the README (PRD §11 wedge)
- [x] Badges row (License, CI, PRD version, Self-host ready, Made in India)
- [ ] Live demo link (deploy to a public URL — pending managed hosting launch per §6.5)
- [x] Move deep architecture detail to `docs/` (API.md, SELF_HOSTING.md, PRD.md)
- [x] Module status table showing what's live vs Phase 3

### 5.3 Distribution
- [ ] Product Hunt, Hacker News "Show HN", r/selfhosted, r/opensource, r/SaaS, r/webdev
- [ ] Submit to awesome-selfhosted (CONTRIBUTING.md/CODE_OF_CONDUCT.md prerequisite now done ✓)
- [ ] Cross-post to Reddit/LinkedIn
- [ ] Position around "AI + PM" once AI ships

### 5.4 GitHub Sponsors
- [ ] Finish Sponsors application review
- [ ] Uncomment `github:` line in `.github/FUNDING.yml` once approved
- [ ] Sequencing: ship → traction → sponsors (unchanged)

### 5.5 Suggested realistic milestone sequence (revised v2.1)
1. ✅ Repo hygiene — done
2. ✅ **Self-host deployment kit** — DONE (Dockerfile + docker-compose.yml + SELF_HOSTING.md)
3. [ ] README rewrite + public demo deploy (README done; public demo pending)
4. [ ] First distribution push
5. [ ] Managed Cloud Hosting launch (business model execution, Section 4)
6. [ ] Sponsors formalized

---

## 6. File map (new/changed this cycle)

**New:**
- `Dockerfile` — multi-stage production image
- `docker-compose.yml` — SQLite + Postgres profiles with backup sidecar
- `.dockerignore`
- `.github/workflows/ci.yml` — 5-job CI pipeline
- `.github/FUNDING.yml` — Sponsors placeholder
- `docs/SELF_HOSTING.md` — 2-minute quickstart + production setup guide
- `docs/API.md` — public API v1 + webhooks reference
- `public/social-preview.png` — 1280×640 OG/social banner
- `scripts/gen-social-preview.py` — regenerates the banner
- `src/lib/auth/config.ts` — NextAuth.js v4 config (Credentials provider, JWT sessions)
- `src/lib/auth/provider.tsx` — client-side `AuthProvider` wrapper
- `src/lib/public-api.ts` — `requirePublicApi()` middleware + helpers
- `src/lib/webhooks.ts` — `emitEvent()` + `dispatchPending()` with HMAC + retry
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth handler
- `src/app/api/api-keys/route.ts` — API key management (create/revoke/list)
- `src/app/api/webhooks/route.ts` — Webhook management (create/delete/list)
- `src/app/api/webhooks/retry/route.ts` — Cron endpoint for retry queue
- `src/app/api/documents/route.ts` — Module 7 docs CRUD with versioning
- `src/app/api/v1/me/route.ts` — Public API: identity check
- `src/app/api/v1/tasks/route.ts` — Public API: list + create tasks
- `src/app/api/v1/projects/route.ts` — Public API: list projects
- `src/app/api/v1/rooms/route.ts` — Public API: list rooms
- `src/app/api/v1/bookings/route.ts` — Public API: list + create bookings
- `src/components/nexus/docs-view.tsx` — Module 7 UI
- `src/components/nexus/apikeys-view.tsx` — API keys + webhooks settings UI

**Changed:**
- `LICENSE` — switched from MIT to AGPL-3.0
- `README.md` — full rewrite as marketing asset
- `package.json` — added `typecheck` script; renamed package to `nexus-suite`; added `license: AGPL-3.0-or-later`
- `.env.example` — added NextAuth env vars + Postgres example
- `prisma/schema.prisma` — added `ApiKey`, `Webhook`, `WebhookDelivery`, `Document`, `DocumentVersion` models
- `src/lib/seed.ts` — seeds 3 wiki docs + enables `collab` module in demo org
- `src/lib/store.ts` — `ViewKey` extended with `docs` and `apikeys`
- `src/components/nexus/sidebar.tsx` — surfaces Module 7 (Docs) + API Keys settings
- `src/components/nexus/app-shell.tsx` — lazy-loads new views
- `src/app/layout.tsx` — wraps app in `AuthProvider`

---

## 7. How this file gets updated

Every time Pranav asks for a project review, Claude will:
1. Re-audit the actual repo state via GitHub (files, commits, structure, stars/forks) — not assume from memory
2. Move items between ✅ Completed / 🔧 Needs Fixing / 🔜 Future based on what's verified
3. Update the "Last reviewed" date and snapshot summary table
4. Check off growth-goal items in Section 5 as they're completed
5. Commit the updated file back to `status/PROJECT_STATUS.md`

---

*This file lives at `status/PROJECT_STATUS.md`. See `docs/PRD.md` for the full product/business spec.*
