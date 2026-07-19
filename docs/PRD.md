# Product Requirements Document (PRD) v2.1
## All-in-One Modular Enterprise Project Management + ERP Suite

**Document Version:** 2.1
**Date:** July 19, 2026
**Author:** Pranav
**Status:** Draft — Revised (open-core business model adopted after market research)

---

## 1. Overview

### 1.1 Problem Statement
Organizations, especially SMEs and growing startups, currently need to stitch together 3-5 separate tools to run their operations:
- A project/task management tool (Jira, Asana, ClickUp)
- An HR performance tool for KRA/KPA tracking (Keka, Lattice)
- A facility/room booking tool (Robin, Skedda, Outlook resource calendars)
- A resource/budget tracking spreadsheet
- A separate chat/collaboration tool

This fragmentation causes data silos, duplicate logins, higher SaaS costs, and poor cross-module visibility.

### 1.2 Solution
Build a **single, modular enterprise management platform** where every capability (Task Management, KRA/KPA, Room Booking, Budgeting, etc.) is built as an independent, toggleable module sharing one core (users, org structure, auth, notifications, database). Organizations activate only the modules they need.

**Strategic positioning (added v2.1):** After market research (see Section 6 and Section 12), Nexus Suite is positioned as a fully free, open-source, self-hostable PM+ERP platform, monetized via an open-core model — not a per-module SaaS subscription. This directly targets the documented reasons enterprises avoid open-source (implementation friction, hosting/ops burden, compliance liability, lack of support) without re-creating the closed-source pricing barriers that make incumbents (SAP, NetSuite, Zoho One) expensive.

### 1.3 Target Users & Personas

**Persona 1 — Priya, Ops Head at a 200-person digital agency**
- Manages 15 concurrent client projects, currently juggles Asana + Excel budget sheets + Outlook room booking
- Wants: Modules 1, 3, 4, 5, 9 active; doesn't care about KRA/KPA

**Persona 2 — Rakesh, HR Manager at a 400-person manufacturing company**
- Runs quarterly appraisal cycles manually via Excel + email
- Wants: Modules 2, 8 active; task-evidence linking from Module 1 is a strong differentiator

**Persona 3 — Sana, Founder at a 25-person startup**
- Wants one lightweight tool instead of 4 free-tier SaaS logins
- Wants: self-hosted, free, Module 1 + Module 3 only enabled

### 1.4 Goals & Success Metrics

| Goal | Metric | Measurement Method |
|---|---|---|
| Reduce tool sprawl | Avg. 3+ tools replaced per customer | Onboarding survey |
| Fast onboarding | Org fully set up in < 1 day | Event log timestamp diff |
| Module adoption | Avg. 4+ modules enabled within 30 days | org_modules table |
| Self-host → managed-hosting conversion | ≥ 5% of self-hosted orgs upgrade to managed hosting within 6 months | Track org hosting_type transitions |
| Retention (managed hosting customers) | < 5% monthly churn after month 3 | Monthly cohort tracking |
| GitHub community traction | Stars, forks, contributors — tracked in status/PROJECT_STATUS.md | GitHub API |
| NPS | ≥ 30 by month 6 | In-app survey, quarterly |

---

## 2. Core Architecture Principle: Modular Toggle System

### 2.1 Concept
Every feature area is a self-contained module with its own DB schema, API routes, UI section, and a shared dependency only on Core.

### 2.2 Module States
- Disabled — not visible anywhere, no data collected
- Enabled (Trial) — visible, usable, time-limited
- Enabled (Active) — fully active
- Enabled (Read-only/Archived) — data preserved, editing locked

### 2.3 Admin Control
Module Marketplace screen in Settings — toggle per module, role mapping, dependency warnings.

### 2.4 Multi-Tenancy Decision
**Chosen: Row-level multi-tenancy** (org_id column on every table), not schema-per-tenant. Rationale: solo-dev bandwidth, simpler ops/backups, requires strict query-middleware tenant scoping enforcement. Revisit for dedicated-infra enterprise customers later. **Note (v2.1):** since self-hosted deployments are now a first-class, expected usage mode (not just managed hosting), single-tenant self-hosted installs skip multi-tenancy concerns entirely — the row-level design only matters for the managed/hosted SaaS offering.

---

## 3. Core (Always-On) System

| Component | Description |
|---|---|
| Auth & SSO | Email/password, Google/Microsoft OAuth, 2FA (TOTP). SAML 2.0 + OIDC — **now core, not Enterprise-gated (v2.1)**, since self-hosted enterprise users need this without paying |
| Org & Team Structure | Companies → Departments → Teams → Users |
| RBAC | Admin, Manager, Employee, Guest/Client |
| User Profiles | Basic info, reporting manager, designation |
| Notifications Engine | See 5.5 |
| Global Search | Cross-module search |
| Audit Log | Who changed what, when |
| Module Marketplace | Enable/disable modules |
| i18n / Localization | See 3.2 |
| Self-host deployment kit | Docker Compose + one-command installer — **new in v2.1**, this is the single most important trust/adoption lever per market research (Section 6) |

### 3.1 Guest/Client Role — Scope Definition
- Can see: shared tasks/projects, comments, milestones (read-only), shared docs
- Cannot see: budget/cost (M5), other clients' projects, KRA/KPA (M2), internal chat, resource allocation (M4)
- Can do: comment, approve/reject milestones if granted, upload files
- Access is per-project, not org-wide

### 3.2 Internationalization (i18n)
- UI string externalization from day one; priority languages post-MVP: Hindi + demand-based
- UTC storage, local timezone render, locale-aware date/number formats
- Multi-currency in Module 5 required for agencies with international clients

---

## 4. Modules

(Unchanged from v2 — see Modules 1–10 as previously specified: Tasks & Projects, KRA/KPA, Room Booking, Resource & Capacity, Budget & Financial, Risk & Issue, Collaboration & Docs, Leave & Attendance, Reporting/BI, Governance/Compliance. **Key change in v2.1: ALL 10 modules, including Module 10 Governance, are now free and open-source** — see Section 6 for what moves to paid tiers instead.)

---

## 4.5 Public API & Webhooks

**Design principles:**
- RESTful, namespaced per module (/api/v1/tasks/*, /api/v1/rooms/*, /api/v1/kra/*)
- Disabled-module endpoints return 403 Module Not Enabled (not 404)
- API keys scoped per-org with granular read/write permission scopes
- **Fully free and unlimited on self-hosted installs (v2.1)** — rate limits only apply to the managed/hosted SaaS tier, where they're a genuine infrastructure cost control, not an artificial upsell lever

**Webhooks:** Event-driven (task.created, booking.confirmed, kra.review_submitted, etc.), configurable per-org, HMAC-signed payloads, retry-with-backoff.

**Native integrations (priority order):**
1. Slack / Microsoft Teams
2. Google Calendar / Outlook (two-way sync for M3)
3. Zapier/Make
4. Accounting exports (Tally/Zoho Books format for M5)

---

## 5. Data Portability

**Import:** CSV/JSON import wizards with field-mapping UI (Jira/Asana/Trello/ClickUp), guided migration wizard with dry-run preview.

**Export:** Full org data export (per-module or org-wide) as JSON/CSV, available to Org Admins anytime. Positioned as an explicit anti-lock-in feature — and since the whole platform is open-source and self-hostable, this claim is structurally true, not just a policy promise.

---

## 5.5 Notification Architecture (Cross-Module)

- Central notification service consumed by all modules
- Deduplication, digest mode, per-user quiet hours, per-module mute controls

---

## 6. Business Model: Open-Core (REWRITTEN v2.1)

### 6.1 Why open-core, not per-module SaaS pricing (research summary)

Market research (see Section 12 for sources) shows that companies pay premium prices for closed-source/SaaS tools not primarily for the software's features, but for three things open-source has traditionally failed to provide:

1. **Zero implementation friction** — sign up and be running same-day, no server/DevOps ownership required
2. **Risk transfer** — a vendor who is contractually and legally on the hook when something breaks, holds compliance certifications, and provides an SLA
3. **Dedicated support** — someone to call, not a GitHub issue queue

A free-but-unsupported open-source tool does not remove these barriers — it just makes the software free while leaving all three barriers in place. Nexus Suite's business model must therefore sell *those three things specifically*, while keeping 100% of the actual software free, open-source, and self-hostable forever. This is the same structural approach used by GitLab (~$580M ARR), Mattermost, and others in the open-core category.

### 6.2 What stays free and open-source forever

- **All 10 modules, full feature set, no artificial gating** — Tasks, KRA/KPA, Room Booking, Resource Management, Budget, Risk, Collaboration, Leave, Reporting, and Governance/Compliance tooling (SSO/SAML, audit export, IP allowlisting)
- Full public API and webhooks, unlimited on self-hosted installs
- Full data export/import, unlimited users, unlimited orgs (self-hosted = one org per install, typically)
- Self-host deployment kit (Docker Compose, one-command installer, documentation)
- **Rationale:** putting core functionality behind a paywall causes exactly the "bait and switch" backlash that damages trust in open-core projects and kills community adoption — the free tier must be genuinely complete, not a crippled trial

### 6.3 What is paid (the actual revenue model)

| Offering | What it sells | Why it's worth paying for |
|---|---|---|
| **Managed Cloud Hosting** | We host it for you — infra, backups, upgrades, uptime SLA | Removes implementation friction (Section 6.1, barrier #1) entirely |
| **Support Plans** (tiered: Community free / Priority / Enterprise SLA) | Guaranteed response times, direct support channel, onboarding assistance | Removes the "no dedicated support" barrier (#3) |
| **Compliance Add-ons** | SOC2 report access, signed DPAs, pen-test reports, dedicated data residency (EU/US region hosting) | Removes the compliance/liability barrier (#2) — these are things that genuinely cost us money to produce/maintain, unlike software features |
| **Enterprise Managed Multi-Org** | Multi-entity/subsidiary management, custom SLAs, dedicated infrastructure | For large enterprises whose scale genuinely requires dedicated resources, not artificial restriction |

### 6.4 Indicative pricing (placeholders, pending benchmarking)

| Tier | Price | What's included |
|---|---|---|
| **Self-Hosted (Community)** | Free forever | All 10 modules, full features, unlimited users, community support (GitHub Discussions/Issues) |
| **Managed Cloud — Starter** | ₹1,499/month flat (not per-user) | Fully hosted, daily backups, standard support (business-hours email) |
| **Managed Cloud — Business** | ₹4,999/month flat | + Priority support (SLA-backed), staging environment, monthly backups export |
| **Managed Cloud — Enterprise** | Custom quote | + SOC2/compliance package, dedicated infra, custom SLA, dedicated data residency, multi-org management |

**Note on flat pricing vs. per-user:** unlike the v2.0 per-user-per-module model, flat organizational pricing better matches the open-core positioning — charging per-user for a "free and open-source" product sends a mixed message. Flat tiers also make cost predictable for budget-conscious SMEs, which is the exact segment currently priced out of NetSuite/SAP implementations.

### 6.5 Sequencing (do not sell before there's trust)

Per the research: "very few sponsors fund a 0-star repo," and the same logic applies to Managed Hosting customers — nobody pays for hosting of a project they've never seen self-hosted successfully by others. Sequencing:
1. Ship modules fully free and open-source (Phase 1/2, already underway)
2. Build genuine self-host adoption and community trust (repo hygiene, distribution — see status/PROJECT_STATUS.md Section 5)
3. Launch Managed Cloud Hosting once there's a track record of the self-hosted product actually working reliably for real orgs
4. Compliance/Enterprise add-ons only once there's inbound demand from an actual prospect asking for them — don't pre-build SOC2 for a hypothetical customer

---

## 7. Non-Functional Requirements (NFRs)

| Category | Target |
|---|---|
| Page load | < 2s initial (p75), < 500ms nav |
| API response | < 200ms (p95) CRUD, < 1s reports |
| Availability (Managed Cloud) | 99.5% Starter/Business, 99.9% Enterprise |
| Concurrent users | 500/org at Business tier |
| Scalability | Horizontal API scaling, DB read replicas for reporting |
| Security baseline | TLS 1.2+, AES-256 at rest, bcrypt/argon2, configurable session timeout |
| Accessibility | WCAG 2.1 AA target |
| Browser support | Latest 2 versions Chrome/Firefox/Safari/Edge |
| Mobile | Responsive web at MVP; native app deferred |

---

## 8. Security & Compliance Baseline

- GDPR-aligned practices from day one (access, erasure, portability)
- Template DPA available for Managed Cloud customers
- Data residency: single region (India) at MVP for Managed Cloud; EU/US deferred to Enterprise add-on
- Backup/DR: daily backups (30-day retention), RPO 24h / RTO 4h at MVP (Managed Cloud only — self-hosted orgs own their own backups)
- Annual pentest once first Enterprise customer requires it
- Public sub-processor list maintained

---

## 9. Onboarding Flow

- Setup wizard: "What are you replacing?" → recommended module bundle → invite team → done
- **Self-host quickstart** (v2.1): `docker compose up` → setup wizard on first load — must work with zero manual config for the demo path
- Optional pre-populated demo project
- Contextual, dismissible in-app tours per module

---

## 10. Roadmap & Prioritization (MoSCoW)

(Unchanged from v2 — Phase 1 MVP, Phase 2 Post-MVP, Phase 3 Scale as previously specified. See status/PROJECT_STATUS.md for live status — Phase 1 complete, Phase 2 modules landed as of this revision.)

**New Phase 1.5 item (v2.1):** Self-host deployment kit (Docker Compose + installer + docs) — this is now a Must-have, not deferred, since the entire business model depends on self-hosting actually being easy.

---

## 11. Go-to-Market (Initial Plan)

- Beta program: 10-15 orgs from network/indie-hacker community
- Launch channels: Product Hunt, Hacker News "Show HN", r/selfhosted, r/opensource, r/SaaS, r/startups, r/IndiaStartups
- **Wedge messaging (revised v2.1):** "The only PM+ERP platform that's actually free — not freemium, not a 14-day trial. Self-host forever, or let us host it for you."
- Submit to awesome-selfhosted and similar curated lists (now feasible — CONTRIBUTING.md/CODE_OF_CONDUCT.md already shipped)

---

## 12. Competitive Analysis (Expanded v2.1)

### 12.1 Closed-source incumbents

| Competitor | Strength | Differentiation |
|---|---|---|
| SAP / NetSuite | Deep enterprise ERP, compliance depth, global scale | Multi-year, 6-9 figure implementations; mid-market ERP implementations average 14.3 months (Panorama Consulting 2025 data) — Nexus Suite targets same-day self-host setup instead |
| Monday/Asana/Jira | Polished UX, huge ecosystem | Per-seat SaaS pricing that compounds with headcount; no ERP depth (budget, KRA/KPA) |
| Zoho One | True all-in-one, 40+ apps | Overwhelming, steep learning curve; not open-source — same lock-in risk as any closed SaaS |

### 12.2 Open-source competitors (researched, ranked by GitHub stars)

| Repo | Stars (approx.) | Category | Notes |
|---|---|---|---|
| [odoo/odoo](https://github.com/odoo/odoo) | ~49.1k | ERP+CRM+PM suite | Closest existing analogue to Nexus Suite's vision; modular apps, GPL. Primary reference architecture. |
| [frappe/erpnext](https://github.com/frappe/erpnext) | ~31.9k | ERP+CRM+PM | Built on Frappe Framework, GPL-3.0, Indian-built (relevant to our India-first wedge) |
| [nocobase/nocobase](https://github.com/nocobase/nocobase) | ~21.6k | No-code app-building platform | Different approach — builds custom systems rather than shipping pre-built modules; worth studying for plugin architecture |
| [hcengineering/huly](https://github.com/hcengineering/huly) | growing fast | PM + collaboration workspace | Closest architectural sibling in spirit — modular workspace blending PM and collaboration |
| [makeplane/plane](https://github.com/makeplane/plane) | growing fast | Issue/PM tracker | Strong Module 1 (Tasks) UX reference |
| [twentyhq/twenty](https://github.com/twentyhq/twenty) | growing fast | CRM | Note: ships under BSL, not permissive — a licensing approach to study, not necessarily copy |
| [Dolibarr/dolibarr](https://github.com/Dolibarr) | established | ERP+CRM+PM, lightweight | Good SMB reference, easy self-host |

### 12.3 The actual gap Nexus Suite fills
None of the Tier-1 open-source players (Odoo, ERPNext, NocoBase) combine PM + KRA/KPA + Room Booking + ERP in a genuinely **toggle-per-module** architecture the way Nexus Suite's PRD specifies — they either ship as large monoliths (Odoo/ERPNext) requiring significant configuration, or as build-your-own platforms (NocoBase) requiring significant development effort to reach parity. The wedge is: **pre-built modules, toggled per org, self-hosted in minutes, genuinely free** — not a feature-count race against Odoo's 260+ modules.

---

## 13. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Solo-dev bandwidth too small for scope | High | High | Strict MVP scoping; contractor in Phase 2 once Managed Cloud revenue supports it |
| Competing vs well-funded incumbents (SAP/NetSuite/Zoho) AND established open-source (Odoo/ERPNext) | High | Medium | Focus on toggle-modularity + India wedge + genuinely-free positioning, not feature parity |
| Open-core "bait and switch" perception if paid tier ever includes core features | Medium | High (kills community trust) | Hard rule: paid tiers only sell hosting/support/compliance, never module features (Section 6.2/6.3) |
| Multi-tenancy data leakage (Managed Cloud) | Medium | Critical | Mandatory tenant-scoping middleware, automated isolation tests pre-release (already built — 17 tests) |
| Self-host setup friction undermines the whole business model | Medium | High | Docker Compose one-command installer treated as Must-have, not nice-to-have (Section 10) |
| Managed Cloud launched before self-host trust exists, so nobody pays | Medium | Medium | Explicit sequencing in Section 6.5 — hosting comes after community traction, not before |

---

## 14. Inconsistencies Resolved (from v1 review)

1. Tasks vs Room Booking first → both ship together in Phase 1
2. M4 depends on M8 not yet built → documented manual fallback
3. Guest/Client role undefined → scoped in 3.1
4. Multi-tenancy undecided → row-level, documented rationale in 2.4
5. **(v2.1) Per-module SaaS pricing conflicted with "disrupt B2B with free open-source" stated goal → resolved by adopting open-core model (Section 6)**

---

## 15. Open Questions (Remaining)

- Exact Managed Cloud pricing needs competitive benchmarking against GitLab/Mattermost-style hosting add-on pricing (Section 6.4 numbers are placeholders)
- License choice: MIT (fully permissive, easiest community adoption) vs. AGPL (prevents competitors from re-hosting Nexus Suite as their own SaaS without contributing back) — needs a decision before first external contributor, since license changes later are painful
- Native mobile — iOS+Android together or one platform first, based on beta user device split?
- At what point (users, revenue) does Managed Cloud hosting get built vs. staying self-host-only?

---

## 16. AI Integration (Planned — Post Phase 1/2)

AI integration is planned once the core modular product is stable and has real usage data. Not scoped for Phase 1 MVP, but the architecture should not block it. Candidate AI features: automated task summarization, smart resource allocation suggestions, AI-assisted appraisal draft writing for Module 2, natural-language task creation, meeting-room booking via chat, anomaly detection in budget burn. **v2.1 note:** AI features should ship in the free/open-source core, consistent with Section 6.2 — AI is a differentiator for adoption (matches the "AI + PM" positioning from the growth goal in status/PROJECT_STATUS.md), not something to gate behind payment.

---

*End of PRD v2.1 — open-core business model formally adopted. Ready for module-by-module technical spec breakdown and self-host deployment kit design.*
