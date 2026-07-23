# Nexus Suite — Project Status

> **This file is the single source of truth for "where things actually stand."**
> It gets updated every time the project is reviewed — by Pranav asking for a review, OR by the autonomous daily agent. Do not treat README.md or docs/PRD.md as the current-status source — this file is.

**Last reviewed:** 2026-07-23
**Reviewed by:** Claude (via Composio MCP, full GitHub audit — verified against actual commits/files, merged with autonomous agent's recent updates)
**Overall phase:** Phase 1 ✅ + Phase 2 ✅ + Phase 3 ✅ (Modules 6, 10, GST, AI) — **all 10 PRD modules now have code.** Not yet production-hardened, zero community traction yet.

---

## 1. Snapshot Summary

| Metric | Value |
|---|---|
| Modules with code | **10 of 10** — Core, Tasks(1), KRA/KPA(2), Rooms(3), Resource(4), Budget(5), Risk(6), Docs(7), Leave(8), Reporting(9), Governance(10) |
| Business model | Open-core (PRD v2.1 §6) — all modules free/self-hostable forever; revenue only from Managed Cloud Hosting, Support SLAs, Compliance add-ons |
| License | **AGPL-3.0-or-later** (switched from MIT — PRD §15 resolved) |
| Auth | Real — NextAuth.js, credentials provider, bcrypt, JWT (demo password fallback preserved) |
| Self-host kit | Shipped — Dockerfile, docker-compose.yml (SQLite + Postgres profiles), docs/SELF_HOSTING.md |
| Public API / Webhooks | Shipped — API v1, API key mgmt, HMAC webhooks w/ retry-backoff, docs/API.md |
| AI integration | Shipped (partial) — NL task creation, task summarization, budget anomaly detection live; 4 more candidate features queued |
| Stars / Forks / Watchers | 0 / 0 / 0 — no distribution/launch has happened yet |
| GitHub topics | 13 set |
| GitHub Discussions | Still disabled |
| Repo | [github.com/pranavgawasproject/nexus-suite](https://github.com/pranavgawasproject/nexus-suite) (public) |
| Stack | Next.js 16, TypeScript 5, Tailwind 4 + shadcn/ui, Prisma + SQLite/Postgres, NextAuth, Zustand + TanStack Query, Recharts, dnd-kit |

---

## 2. ✅ Completed (verified against actual repo contents)

### Core
- Session bootstrap, RBAC, audit log, notifications, cross-module search, team/org structure
- Module Marketplace (toggle API + UI)
- Onboarding wizard (4-step)
- Data export (per-module JSON/CSV)
- Row-level multi-tenancy (`orgId` everywhere) + 17-test tenant-isolation suite
- `403 Module Not Enabled` enforcement via `requireModule()` on all module routes
- Zod validation on all create/update routes
- Central notification service, standardised audit helper
- **Real auth (NextAuth.js)** — credentials provider, bcrypt password hashing, JWT sessions, custom sign-in page
- **Self-host deployment kit** — Dockerfile (multi-stage, non-root, healthcheck), docker-compose.yml (SQLite default + Postgres w/ backup sidecar profile), docs/SELF_HOSTING.md
- **Public API v1** — `/api/v1/*` routes, API key management (bcrypt-hashed, scoped read/write/webhooks), docs/API.md
- **Webhooks** — HMAC-SHA256 signed, 5-retry exponential backoff, 15+ event types, management endpoints

### All 10 Modules — code complete
1. **Tasks & Projects** — Kanban/list, drag-drop, priorities, dependencies
2. **KRA/KPA** — full lifecycle (draft→self_review→manager_review→calibration→closed)
3. **Room Booking** — calendar, conflict prevention, recurrence
4. **Resource & Capacity** — allocation CRUD, over-allocation detection
5. **Budget** — project budgets, expenses, **GST engine** (CGST/SGST/IGST, HSN/SAC lookup), **multi-currency** (9 currencies, FX conversion)
6. **Risk & Issue Management** (NEW — Phase 3) — risk register (likelihood×impact), issue log w/ escalation (L1/L2/L3), change request workflow
7. **Collaboration & Docs** — wiki docs w/ versioning, markdown editor
8. **Leave & Attendance** — approval workflow, check-in/out, holiday calendar
9. **Reporting/BI** — cross-module dashboards, KPI cards
10. **Governance & Compliance** (NEW — Phase 3) — 5 policy types (retention, IP allowlist, SSO enforcement, data residency, password), SOC2/ISO-ready audit export (CSV+JSON). **Ships free/open-source per PRD v2.1, not enterprise-gated.**

### AI Integration (Phase 3, partial — PRD §16)
- `src/lib/ai.ts`: natural-language task creation, task summarization, budget anomaly detection
- Graceful fallback if AI not configured

### Growth / Community
- 13 GitHub topics set
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, social preview image, `FUNDING.yml` (placeholder, uncommented until Sponsors approved)
- README rewritten as marketing asset — hero, badges, comparison table vs Monday/Asana/Jira AND Odoo/ErpNext, "genuinely free" messaging
- Commit authorship fixed (real GitHub identity, not bot names)

### Strategy
- Market research on SaaS/ERP pricing dynamics → open-core business model adopted (PRD v2.1)
- Competitive landscape mapped (Odoo, ERPNext, NocoBase, Huly, Plane, Twenty, Dolibarr, etc.)
- License decision made: AGPL-3.0-or-later

---

## 3. 🔧 Needs Fixing / Hardening (currently open, verified)

- [ ] **CI workflow blocked — needs YOUR action, not AI-fixable.** `.github/workflows/ci.yml` is committed locally but GitHub rejects workflow-file pushes from PATs lacking the `workflow` scope. **You must generate a new PAT/token with the `workflow` scope and update the Composio GitHub connection with it** — no AI agent can bypass this GitHub-side restriction.
- [ ] Module-gate tests scaffolded but blocked by dev-server stability issues
- [ ] Production Postgres path unverified — schema + Docker Compose support it, but no real run has been done against Postgres yet (SQLite-only so far)
- [ ] Webhook retry endpoint exists but isn't wired to an actual cron/scheduler
- [ ] GitHub Discussions still disabled
- [ ] License badge/detection: GitHub's API currently shows license as "Other/NOASSERTION" rather than recognizing AGPL-3.0 automatically — worth checking that the `LICENSE` file uses GitHub's exact expected AGPL-3.0 text so it displays correctly on the repo page

---

## 4. 👤 YOUR next actions (things only Pranav can/should do — not for the AI agent)

These require a human decision, external account access, or judgment calls the automation shouldn't make unsupervised:

1. **Fix the CI token scope** (see Section 3) — blocking automated testing/linting on every PR, which matters more now that the codebase is this large
2. **Verify AGPL license display** — confirm github.com/pranavgawasproject/nexus-suite correctly shows "AGPL-3.0" as the detected license (currently shows NOASSERTION)
3. **Actually run the self-host kit once, yourself** — `docker compose up` on a clean machine/VM and confirm it genuinely works end-to-end before you tell anyone else to try it. This is your core pitch ("self-host in minutes") — don't launch on an unverified claim.
4. **Decide when to flip GitHub Discussions on** — low effort, but you should turn it on right before your first real distribution push (HN/Product Hunt), not months early with no one to answer questions
5. **Finish GitHub Sponsors application** (2FA, bank/tax info) if not done — `FUNDING.yml` is ready and waiting, uncomment it once approved
6. **Decide on the first distribution push timing** — per PRD §6.5/§11, this should happen only after self-host is verified (item 3) and README/demo are launch-ready. You are close — this could realistically happen in the next 1-2 weeks if item 3 checks out.
7. **Set up a public live demo deployment** (e.g. free-tier Vercel/Render with seeded SQLite data) — referenced in the growth plan but not yet done; this is what turns a browser into a stargazer
8. **Review what the AI automation actually built** — especially the GST engine (Module 5) and Governance module (Module 10), since tax/compliance logic has real-world correctness stakes if anyone self-hosts this for actual business use. Spot-check `src/lib/gst.ts` and the audit-export logic yourself before trusting them.
9. **Keep an eye on the status file's format** — different AI agents running this loop (you mentioned trying Grok) will format status/PROJECT_STATUS.md slightly differently each time. Worth periodically confirming it still reads clearly rather than degrading into shorthand over many runs.

---

## 5. 🤖 Automation backlog (for the daily AI agent — Track A candidates, in rough priority order)

1. Wire the webhook retry endpoint to an actual scheduled trigger (or document that it needs external cron since serverless can't self-schedule)
2. Build the CSV/JSON import wizard (Jira/Asana/Trello/ClickUp) — PRD §5, not started
3. Remaining AI features (PRD §16) — 4 of 7 candidates left: smart resource allocation suggestions, AI-assisted appraisal draft writing (Module 2), chat-based room booking, remaining anomaly-detection surfaces
4. Advanced BI widgets — trends, forecasts, heatmaps (basic reporting already done)
5. Slack/Microsoft Teams integration (PRD §4.5)
6. Resolve module-gate test blockage (dev-server stability)
7. Run and document an actual Postgres smoke test

---

## 6. 🏆 Growth Goal: #1 Open-Source AI + Project Management Repo

**Stated goal:** Most-starred/forked open-source "AI + PM" repo + GitHub Sponsors acceptance.

**Where this actually stands:** the code-side work for a credible launch is essentially done — self-host kit, real auth, README-as-landing-page, social preview, all 10 modules. **The bottleneck is no longer code — it's distribution and verification (Section 4).** Stars/forks are still 0 because nothing has been launched publicly yet, not because the product isn't ready.

### Remaining hygiene
- [ ] Enable GitHub Discussions (timed to launch, see Section 4.4)
- [ ] Confirm license badge displays correctly (Section 4.2)
- [ ] CI badge on README (blocked on Section 3 CI fix)

### Launch sequence (per PRD §6.5/§11 — unchanged, now much closer)
1. ~~Repo hygiene~~ ✅
2. ~~Self-host deployment kit~~ ✅ (verify it works — Section 4 item 3)
3. ~~README rewrite~~ ✅ / Public demo deploy — still needed (Section 4 item 7)
4. First distribution push (HN, Product Hunt, r/selfhosted, awesome-selfhosted) — next real milestone
5. Managed Cloud Hosting launch — after distribution proves traction
6. Sponsors formalized

---

## 7. How this file gets updated

- **When Pranav asks for a review:** re-audit the actual repo state via GitHub (commits, files, stats) — never assume from memory. Preserve this file's full structure (don't silently condense sections away).
- **When the autonomous daily agent runs:** update Section 2/3/5 based on what it built, log new backlog candidates, update "Last reviewed." The agent should NOT remove Section 4 (human action items) — that section is for Pranav, not for the agent to complete or delete.
- Always keep Section 1 (Snapshot) and stars/forks numbers current so growth progress is trackable over time.

---

*This file lives at `status/PROJECT_STATUS.md`. See `docs/PRD.md` for the full product/business spec, `docs/API.md` and `docs/SELF_HOSTING.md` for technical docs.*
