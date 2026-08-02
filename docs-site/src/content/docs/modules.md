---
title: Modules
description: All 10 Nexus Suite modules, toggleable per organization.
---

All 10 modules ship free and open-source. Toggle each one on or off individually per org from the Module Marketplace in Settings — disabled modules are invisible everywhere and their API endpoints return `403 Module Not Enabled` rather than `404`.

| # | Module | Status | Description |
|---|---|---|---|
| 1 | **Tasks & Projects** | Live | Kanban + list views, priorities, types, assignees, due dates, estimates, dependencies, cycles/sprints, checklists, worklogs, Gantt |
| 2 | **KRA / KPA & Performance** | Live | KRA lifecycle (draft → self → manager → calibration → closed), ratings + comments |
| 3 | **Meeting Room & Resource Booking** | Live | Room inventory, conflict-free calendar, recurring bookings, amenities |
| 4 | **Resource & Capacity** | Live | Per-user allocation %, workload view, over-allocation detection |
| 5 | **Budget & Financial Tracking** | Live (INR, multi-currency added) | Project budgets, expense logging, budget vs. actual, category breakdown |
| 6 | **Risk & Issue Management** | Live | Risk register (likelihood × impact), issue log, change requests |
| 7 | **Collaboration & Docs** | Live | Markdown wiki with versioning, nested pages, public/guest sharing |
| 8 | **Leave & Attendance** | Live | Leave requests with approval workflow, check-in/out, holiday calendar |
| 9 | **Reporting & Analytics** | Live | Cross-module KPIs, charts, graceful hiding for disabled modules |
| 10 | **Governance, Compliance & Audit** | Live | Advanced audit export, e-signature, retention policies, IP allowlisting |

## Guest / Client role

Modules apply a scoped guest role for external collaborators:

- **Can see:** shared tasks/projects, comments, milestones (read-only), shared docs
- **Cannot see:** budget/cost (Module 5), other clients' projects, KRA/KPA (Module 2), internal chat, resource allocation (Module 4)
- **Can do:** comment, approve/reject milestones if granted, upload files
- Access is scoped per-project, not org-wide

## Module state model

Each module can be in one of four states:

- **Disabled** — not visible anywhere, no data collected
- **Enabled (Trial)** — visible, usable, time-limited
- **Enabled (Active)** — fully active
- **Enabled (Read-only/Archived)** — data preserved, editing locked

See the [Architecture](/architecture/) page for how the toggle system is implemented under the hood.
