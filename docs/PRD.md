# Product Requirements Document (PRD) v2
## All-in-One Modular Enterprise Project Management Suite

**Document Version:** 2.0
**Date:** July 19, 2026
**Author:** Pranav
**Status:** Draft — Revised (incorporates gap review)

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

### 1.3 Target Users & Personas

**Persona 1 — Priya, Ops Head at a 200-person digital agency**
- Manages 15 concurrent client projects, currently juggles Asana + Excel budget sheets + Outlook room booking
- Wants: Modules 1, 3, 4, 5, 9 active; doesn't care about KRA/KPA

**Persona 2 — Rakesh, HR Manager at a 400-person manufacturing company**
- Runs quarterly appraisal cycles manually via Excel + email
- Wants: Modules 2, 8 active; task-evidence linking from Module 1 is a strong differentiator

**Persona 3 — Sana, Founder at a 25-person startup**
- Wants one lightweight tool instead of 4 free-tier SaaS logins
- Wants: Free/Starter tier — Module 1 + Module 3 only

### 1.4 Goals & Success Metrics

| Goal | Metric | Measurement Method |
|---|---|---|
| Reduce tool sprawl | Avg. 3+ tools replaced per customer | Onboarding survey |
| Fast onboarding | Org fully set up in < 1 day | Event log timestamp diff |
| Module adoption | Avg. 4+ modules enabled within 30 days | org_modules table |
| Retention | < 5% monthly churn after month 3 | Monthly cohort tracking |
| Time-to-first-value | First action within 15 mins of signup | Event tracking |
| NPS | ≥ 30 by month 6 | In-app survey, quarterly |
| CSAT | ≥ 4.2/5 | Post-ticket survey |
| DAU/MAU | ≥ 40% | Analytics event tracking |

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
**Chosen: Row-level multi-tenancy** (org_id column on every table), not schema-per-tenant. Rationale: solo-dev bandwidth, simpler ops/backups, requires strict query-middleware tenant scoping enforcement. Revisit for dedicated-infra enterprise customers later.

---

## 3. Core (Always-On) System

| Component | Description |
|---|---|
| Auth & SSO | Email/password, Google/Microsoft OAuth, 2FA (TOTP). Enterprise: SAML 2.0 + OIDC |
| Org & Team Structure | Companies → Departments → Teams → Users |
| RBAC | Admin, Manager, Employee, Guest/Client |
| User Profiles | Basic info, reporting manager, designation |
| Notifications Engine | See 5.5 |
| Global Search | Cross-module search |
| Audit Log | Who changed what, when |
| Billing & Subscription | Module-based pricing |
| Module Marketplace | Enable/disable modules |
| i18n / Localization | See 3.2 |

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

### MODULE 1: Task & Project Management
Projects → Epics/Milestones → Tasks → Subtasks. List/Kanban/Calendar/Gantt views. Sprints, backlog, dependencies, recurring tasks, custom fields, templates, CSV/JSON import (Jira/Asana/Trello/ClickUp), automation rules, task template library.
**Dependencies:** Core only

### MODULE 2: KRA / KPA & Performance Management
KRA/KPA definition, self+manager review workflow, configurable rating scales, 360 feedback, appraisal cycles, task-evidence linking from M1 (manual fallback if M1 off), performance history, PDF export, calibration sessions, skip-level review, opt-in bell-curve normalization.
**Dependencies:** Core; soft-link to M1

### MODULE 3: Meeting Room & Resource Booking
Room/asset inventory, calendar booking with conflict prevention, recurring bookings, approval workflow, check-in/no-show auto-release, Outlook/Google two-way sync, QR/tablet display (stretch), desk booking, catering/AV add-ons, visitor management hook.
**Dependencies:** Core; optional link to M1

### MODULE 4: Resource & Capacity Management
Team workload view, skill tagging, resource allocation %, leave integration from M8 (manual fallback if M8 off), utilization reports.
**Dependencies:** Core; benefits from M1, M8

### MODULE 5: Budget & Financial Tracking
Project budgets, expense logging, time→cost calculation, client invoicing, budget vs actual dashboards, multi-currency conversion engine, purchase orders, GST tax handling (CGST/SGST/IGST, HSN/SAC).
**Dependencies:** Core; integrates with M1, M4

### MODULE 6: Risk & Issue Management
Risk register (likelihood x impact), issue log with escalation, change request tracking, risk owner/mitigation.
**Dependencies:** Core; links to M1

### MODULE 7: Collaboration & Docs
Threaded team chat, shared docs/wiki with versioning, file storage, comment threads, @mentions, video conferencing embed (Jitsi default, Zoom/Teams optional).
**Dependencies:** Core; deep-link to M1

### MODULE 8: Leave & Attendance Management
Leave application/approval, balance tracking, attendance check-in, holiday calendar, feeds M4 automatically, labor-law-aligned leave policy templates (India state-specific).
**Dependencies:** Core

### MODULE 9: Reporting & Analytics / BI Dashboard
Customizable dashboards, cross-module widgets, scheduled report emails, PDF/Excel export, role-based visibility, graceful hiding of disabled-module widgets.
**Dependencies:** Core; pulls from enabled modules
**Pricing note:** Basic reporting available from Growth tier (not gated to Business) — this is the "glue" module and should be felt early.

### MODULE 10: Governance, Compliance & Audit (Enterprise Add-on)
Advanced audit export (SOC2/ISO-ready), doc version control + e-signature, data retention policy, IP allowlisting, SSO enforcement toggle.
**Dependencies:** Core; Enterprise-tier add-on

---

## 4.5 Public API & Webhooks

**Design principles:**
- RESTful, namespaced per module (/api/v1/tasks/*, /api/v1/rooms/*, /api/v1/kra/*)
- Disabled-module endpoints return 403 Module Not Enabled (not 404)
- API keys scoped per-org with granular read/write permission scopes
- Tiered rate limits by plan

**Webhooks:** Event-driven (task.created, booking.confirmed, kra.review_submitted, etc.), configurable per-org, HMAC-signed payloads, retry-with-backoff.

**Native integrations (priority order):**
1. Slack / Microsoft Teams
2. Google Calendar / Outlook (two-way sync for M3)
3. Zapier/Make
4. Accounting exports (Tally/Zoho Books format for M5)

---

## 5. Data Portability

**Import:** CSV/JSON import wizards with field-mapping UI (Jira/Asana/Trello/ClickUp), guided migration wizard with dry-run preview.

**Export:** Full org data export (per-module or org-wide) as JSON/CSV, available to Org Admins anytime — not just on cancellation. Positioned as an explicit anti-lock-in feature.

---

## 5.5 Notification Architecture (Cross-Module)

- Central notification service consumed by all modules (modules emit events, service decides delivery)
- Deduplication: batch multiple events about the same object into one digest instead of separate pings
- Channels: in-app, email, push, Slack/Teams
- Digest mode for low-priority categories
- Per-user quiet hours
- Per-module mute controls

---

## 6. Suggested Pricing Model (Toggle-Based)

| Tier | Price (indicative) | Included |
|---|---|---|
| Free/Starter | ₹0 | Core + M1 only, up to 10 users, 14-day trial of 1 extra module |
| Growth | ₹299/user/mo (₹249 annual) | Core + any 3 modules + basic Reporting |
| Business | ₹599/user/mo (₹499 annual) | Core + any 6 modules + advanced Reporting/BI |
| Enterprise | Custom quote | All modules + Governance, custom SLA, SSO enforcement |

14-day full-feature trial, no card required. ~17% annual discount. Prices are placeholders pending competitive benchmarking (Zoho One, Keka, ClickUp India).

---

## 7. Non-Functional Requirements (NFRs)

| Category | Target |
|---|---|
| Page load | < 2s initial (p75), < 500ms nav |
| API response | < 200ms (p95) CRUD, < 1s reports |
| Availability | 99.5% Growth/Business, 99.9% Enterprise |
| Concurrent users | 500/org at Business tier |
| Scalability | Horizontal API scaling, DB read replicas for reporting |
| Security baseline | TLS 1.2+, AES-256 at rest, bcrypt/argon2, configurable session timeout |
| Accessibility | WCAG 2.1 AA target |
| Browser support | Latest 2 versions Chrome/Firefox/Safari/Edge |
| Mobile | Responsive web at MVP; native app deferred |

---

## 8. Security & Compliance Baseline

- GDPR-aligned practices from day one (access, erasure, portability)
- Template DPA available for B2B customers
- Data residency: single region (India) at MVP, EU/US deferred to Enterprise
- Backup/DR: daily backups (30-day retention), RPO 24h / RTO 4h at MVP
- Annual pentest once first Enterprise customer requires it; internal review pre-release meanwhile
- Public sub-processor list maintained

---

## 9. Onboarding Flow

- Setup wizard: "What are you replacing?" → recommended module bundle → invite team → done
- Optional pre-populated demo project
- Contextual, dismissible in-app tours per module
- Empty states for disabled modules with one-click enable CTA

---

## 10. Roadmap & Prioritization (MoSCoW)

### Phase 1 — MVP (Est. 4-5 months, solo dev)
**Must-have:** Core, Module 1 (Tasks), Module 3 (Room Booking), Module 9 (basic Reporting), data export, onboarding wizard
**Should-have:** M1 automation rules & CSV import, basic read-only public API
**Won't-have:** KRA/KPA, Budget, Risk, Collaboration, Leave, Governance modules; SAML/OIDC; native mobile

### Phase 2 — Post-MVP (Est. 3-4 months)
**Must-have:** Module 8 (Leave), Module 4 (Resource), Module 2 (basic KRA/KPA), full public API + webhooks, Slack/Teams integration
**Should-have:** Module 5 (Budget, INR only), Module 7 (docs only)

### Phase 3 — Scale (ongoing, demand-driven)
Module 6 (Risk), Module 10 (Governance), multi-currency + GST engine, SAML/OIDC, advanced BI, native mobile app, i18n beyond English

Estimates are rough solo-dev planning figures, to be tightened once Module 1 build begins.

---

## 11. Go-to-Market (Initial Plan)

- Beta program: 10-15 orgs from network/indie-hacker community, free access for feedback + testimonials
- Launch channels: Product Hunt, Indie Hackers, r/SaaS, r/startups, r/IndiaStartups, build-in-public LinkedIn content
- Wedge messaging: "Stop paying for 4 tools — Indian pricing, integrated HR + PM, pay only for modules you use"
- Self-serve for Free/Growth; manual demo for Business/Enterprise as product matures

---

## 12. Competitive Analysis (Summary)

| Competitor | Strength | Differentiation |
|---|---|---|
| Jira/Asana | Best-in-class tasks, ecosystem | No KRA/KPA or room booking; expensive at scale |
| Keka/Zoho People | Strong HR/KRA | Weak/no PM depth |
| Zoho One | True all-in-one | Overwhelming (40+ apps), steep learning curve |
| OpenProject | Open-source, strong PM | No HR/facility modules, IT-heavy setup |
| Robin/Skedda | Best-in-class room booking | Single-purpose only |

**Wedge:** Modular simplicity + India-first pricing/GST/labor-law awareness + genuine cross-module data (task evidence feeding KRA reviews).

---

## 13. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Solo-dev bandwidth too small for scope | High | High | Strict MVP scoping; contractor in Phase 2 once revenue supports it |
| Competing vs well-funded incumbents | High | Medium | Focus on modular-simplicity + India wedge, not feature parity |
| Multi-tenancy data leakage | Medium | Critical | Mandatory tenant-scoping middleware, automated isolation tests pre-release |
| Feature creep delaying MVP | High | High | Hard Won't-have list; resist new modules pre-revenue |
| Enterprise buyers blocked by missing SAML/compliance | Medium | Medium | Deferred to Phase 3; target SME/mid-market first |

---

## 14. Inconsistencies Resolved (from v1 review)

1. Tasks vs Room Booking first → both ship together in Phase 1
2. M4 depends on M8 not yet built → documented manual fallback
3. Guest/Client role undefined → scoped in 3.1
4. Multi-tenancy undecided → row-level, documented rationale in 2.4

---

## 15. Open Questions (Remaining)

- Self-hosted/on-prem option for Enterprise tier, or SaaS-only indefinitely?
- Separate HR Admin role vs Manager covering both, for KRA/KPA?
- Exact pricing needs competitive benchmarking (Section 6 numbers are placeholders)
- Native mobile — iOS+Android together or one platform first, based on beta user device split?

---

## 16. AI Integration (Planned — Post Phase 1/2)

AI integration is planned once the core modular product is stable and has real usage data. Not scoped for Phase 1 MVP, but the architecture should not block it. Candidate AI features to explore later: automated task summarization, smart resource allocation suggestions, AI-assisted appraisal draft writing for Module 2, natural-language task creation, meeting-room booking via chat, anomaly detection in budget burn. To be scoped in detail in a dedicated AI-features PRD once the core suite ships.

---

*End of PRD v2 — ready for module-by-module technical spec breakdown when you're ready to start building.*
