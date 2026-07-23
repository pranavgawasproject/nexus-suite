# Nexus Suite — Project Status

> **This file is the single source of truth for "where things actually stand."**

**Last reviewed:** 2026-07-19 (6th update — Phase 3: Module 6 Risk + Module 10 Governance UI + Multi-currency/GST engine + AI integration)
**Reviewed by:** Claude (direct repo work)
**Overall phase:** Phase 1 ✅ + Phase 2 ✅ + Phase 3 (Modules 6, 10 + GST + AI) ✅. All 10 PRD modules now have code. Native mobile + advanced i18n still pending.

---

## 1. Snapshot Summary

| Metric | Value |
|---|---|
| Current phase | Phase 1 ✅ + Phase 2 ✅ + Phase 3 (4 items) ✅ |
| Modules live | **All 10 PRD modules have code** — Core, Tasks, Rooms, Reporting, Leave, Resource, KRA/KPA, Budget (with GST), Docs, **Risk (M6)**, **Governance UI (M10)** |
| Business model | Open-core (PRD v2.1 §6) — all modules free/AGPL forever |
| License | AGPL-3.0-or-later |
| API | Public REST `/api/v1/*` + HMAC-signed webhooks with retry + **AI endpoints** (`/api/ai/parse-task`, `/api/ai/summarize-task`, `/api/ai/budget-anomalies`) |
| Tests | 17 tenant-isolation tests passing |
| CI | GitHub Actions: lint → typecheck → tenant tests → build → Docker (committed locally, needs workflow-scoped PAT to push) |
| Self-host | `docker compose up -d --build` |
| Stars / Forks / Watchers | 0 / 0 / 0 |
| Repo | [github.com/pranavgawasproject/nexus-suite](https://github.com/pranavgawasproject/nexus-suite) (public, AGPL-3.0) |

---

## 2. ✅ Completed

### Core
- [x] Session bootstrap, RBAC, audit log, notifications, cross-module search, team/org structure
- [x] Module Marketplace, Onboarding wizard, Data export (now covers all 10 modules), App shell
- [x] Row-level multi-tenancy
- [x] Demo seed data (now seeds all 10 modules — risks, issues, change requests, policies, docs)
- [x] `403 Module Not Enabled` enforcement, Zod validation, tenant-isolation tests
- [x] Central notification service, standardised audit helper
- [x] **NextAuth.js v4 wired** — Credentials provider, bcrypt, demo fallback
- [x] **Public API v1** — API keys + scopes + 403 module gates + 5 endpoints
- [x] **Webhooks** — HMAC-signed, 5-retry exponential backoff, 15+ events
- [x] **Self-host kit** — Dockerfile + docker-compose (SQLite + Postgres profiles) + docs
- [x] **AI integration (PRD §16)** — natural-language task creation, task summarization, budget anomaly detection (via z-ai-web-dev-sdk; ships free in core per PRD v2.1)

### Modules — ALL 10 NOW HAVE CODE
- [x] Module 1 (Tasks) — Phase 1, with AI natural-language task creation
- [x] Module 2 (KRA/KPA) — Phase 2, full lifecycle
- [x] Module 3 (Rooms) — Phase 1
- [x] Module 4 (Resource & Capacity) — Phase 2
- [x] Module 5 (Budget) — Phase 2 + **GST engine (CGST/SGST/IGST, HSN/SAC)** + multi-currency support (Phase 3 upgrade)
- [x] Module 6 (Risk & Issue) — **NEW (Phase 3)** — risk register with likelihood × impact, issue log with escalation, change requests with approve/reject workflow
- [x] Module 7 (Docs & Wiki) — Phase 2, markdown with versioning
- [x] Module 8 (Leave & Attendance) — Phase 2
- [x] Module 9 (Reporting) — Phase 1
- [x] Module 10 (Governance UI) — **NEW (Phase 3)** — 5 policy types (retention, IP allowlist, SSO enforcement, data residency, password), SOC2/ISO-ready audit export (CSV + JSON), all free per PRD v2.1

### Growth / Community
- [x] GitHub topics, CONTRIBUTING.md, CODE_OF_CONDUCT.md, social preview image, FUNDING.yml placeholder
- [x] README rewritten as marketing asset
- [x] Commit authorship fixed

---

## 3. 🔧 Needs Fixing / Hardening

- [ ] **CI workflow file push blocked** — `.github/workflows/ci.yml` is committed locally but GitHub blocks workflow file pushes from PATs without `workflow` scope. Need a workflow-scoped PAT to push.
- [ ] **Module-gate tests** — scaffolded but blocked by dev-server stability
- [ ] **Production Postgres smoke test** — schema supports it, Docker Compose ships it, but real-world run not yet performed
- [ ] **Sign-in UI** — NextAuth wired but no custom sign-in page yet
- [ ] **Webhook retry cron** — endpoint exists, needs cron job to call it
- [ ] **CSV import wizard** (PRD §5) — not started
- [ ] **Slack/Teams integration** (PRD §4.5) — not started
- [ ] **Advanced BI widgets** — trends, forecasts, heatmaps (basic reporting done)
- [ ] **AI features still to build** — smart resource allocation, AI-assisted appraisal drafting, chat-based room booking (3 candidates done, 4 remaining per PRD §16)

---

## 4. 🔜 Future / Not Started

### Phase 2 remaining
- [ ] Slack/Microsoft Teams integration
- [ ] CSV import wizard (Jira/Asana/Trello/ClickUp)

### Phase 3 remaining
- [ ] SAML/OIDC (Enterprise auth — Governance UI has the toggle, but the actual SAML provider integration is not built)
- [ ] Advanced cross-module BI widgets (trends, forecasts, heatmap)
- [ ] Native mobile app
- [ ] i18n beyond English

### Long-term (per PRD §16)
- [ ] AI features remaining: smart resource allocation, AI-assisted appraisal drafting, chat-based room booking, deeper budget anomaly detection with AI explanations

### Business model execution (per PRD v2.1 §6.5)
- [x] Step 1: Self-host deployment kit — DONE
- [ ] Step 2: Build community trust/traction
- [ ] Step 3: Launch Managed Cloud Hosting
- [ ] Step 4: Compliance/Enterprise add-ons

---

## 5. 🏆 Growth Goal

### 5.1-5.4 (unchanged from prior cycle)
See prior status. Most repo-hygiene items done. Distribution push (Show HN, r/selfhosted, awesome-selfhosted) still pending.

### 5.5 Milestone sequence
1. ✅ Repo hygiene
2. ✅ Self-host deployment kit
3. [ ] README rewrite (done) + public demo deploy (pending)
4. [ ] First distribution push
5. [ ] Managed Cloud Hosting launch
6. [ ] Sponsors formalized

---

## 6. File map (new/changed this cycle)

**New:**
- `src/lib/ai.ts` — AI helpers using z-ai-web-dev-sdk (NL task parsing, summarization, anomaly detection)
- `src/lib/gst.ts` — GST calculation (CGST/SGST/IGST), HSN/SAC lookup, multi-currency FX conversion
- `src/app/api/risks/route.ts` — Module 6 risk register CRUD
- `src/app/api/issues/route.ts` — Module 6 issue log CRUD with escalation
- `src/app/api/change-requests/route.ts` — Module 6 change request workflow
- `src/app/api/policies/route.ts` — Module 10 governance policy upsert/list/delete
- `src/app/api/audit/export/route.ts` — SOC2/ISO-ready audit log CSV/JSON export
- `src/app/api/ai/parse-task/route.ts` — AI: natural-language → structured task
- `src/app/api/ai/summarize-task/route.ts` — AI: task summary
- `src/app/api/ai/budget-anomalies/route.ts` — AI: budget burn anomaly detection
- `src/components/nexus/risk-view.tsx` — Module 6 UI (3 tabs: risks, issues, change requests)
- `src/components/nexus/governance-view.tsx` — Module 10 UI (5 policy cards + audit export)

**Changed:**
- `prisma/schema.prisma` — added `Risk`, `Issue`, `ChangeRequest`, `Policy`, `Signature` models; extended `Expense` with GST + multi-currency fields; extended `Organization` + `Project` relations
- `src/lib/schemas.ts` — zod schemas for all new modules + GST + multi-currency
- `src/lib/seed.ts` — seeds 6 risks, 3 issues, 3 change requests, 5 default policies; enables `risk` + `governance` modules in demo org
- `src/lib/store.ts` — ViewKey extended with `risk` + `governance`
- `src/lib/modules.ts` — Governance tier changed from `enterprise` → `starter` (free per v2.1)
- `src/components/nexus/sidebar.tsx` — surfaces Risk + Governance in nav
- `src/components/nexus/app-shell.tsx` — lazy-loads new views
- `src/components/nexus/tasks-view.tsx` — added AI natural-language task creation button
- `src/components/nexus/export-view.tsx` — added Risk + Governance export options
- `src/app/api/export/route.ts` — exports risks/issues/CRs/policies/signatures

---

## 7. How this file gets updated

Every time Pranav asks for a project review, Claude will:
1. Re-audit the actual repo state via GitHub
2. Move items between ✅ / 🔧 / 🔜 based on what's verified
3. Update the "Last reviewed" date and snapshot summary
4. Commit the updated file back to `status/PROJECT_STATUS.md`

---

*All 10 PRD modules now have code. Remaining work is hardening + distribution + the long-tail items (mobile, i18n, deeper AI).*
