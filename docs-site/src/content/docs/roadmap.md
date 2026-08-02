---
title: Roadmap & Status
description: Live project status and the phased roadmap toward launch.
---

:::note
This page is a snapshot. The single source of truth for exact status always lives at [`status/PROJECT_STATUS.md`](https://github.com/pranavgawasproject/nexus-suite/blob/main/status/PROJECT_STATUS.md) in the repo.
:::

**Vision:** become the #1 most-starred, most-forked open-source AI + ERP/PM platform on GitHub.

## Phase 1 — Core Product ✅ Complete

- All 10 PRD modules, full depth (cycles, retros, comments, milestones, dependencies, checklists, worklogs, Gantt, subtasks, CSV import)
- Public API v1 — 28+ endpoint groups
- Full CI — stable and green
- Self-host deploy kit (Dockerfile + docker-compose + install.sh)
- Cycles/Sprints, Retrospectives, Milestones, Dependencies, Gantt, Checklists, Worklogs

## Phase 2 — AI Integration & Extensibility ✅ Complete

- AI-assisted task/project creation and summarization
- AI-powered reporting & analytics insights (dashboard insights)
- AI copilot for admins (governance/compliance checks, KPI suggestions)
- Two-way GitHub sync (issues ↔ tasks, HMAC-verified webhook receiver, outbound sync via GitHub API)
- Custom fields / metadata-driven forms (ERPNext DocType-style pattern), 8 field types
- One-command installer (`install.sh`)
- License locked in as **AGPL-3.0-or-later**
- Verification: typecheck PASS, lint PASS, build PASS, test:tenant 17/17 PASS

## Phase 3 — Polish, UI Completion & Live Demo 🔄 In Progress

Done:
- Custom Fields frontend UI components
- Multi-currency support (USD, EUR, GBP alongside INR)
- Google & GitHub OAuth login alongside credentials

Still open:
- Deploy a live 1-click interactive demo instance (e.g. `demo.nexussuite.org`)
- Upgrade README with rich feature GIFs and screenshots
- Build a dedicated documentation site — **this site**

## Phase 4 — Growth, Launch & Community (Planned)

- Public launch campaign: Hacker News ("Show HN"), Reddit (`r/selfhosted`, `r/opensource`, `r/webdev`), Product Hunt
- YouTube video walkthrough (2-minute quickstart + feature tour)
- Set up GitHub Discussions & Discord community for self-hosters
- Complete GitHub Sponsors verification & onboarding
- Grow contributor base via documented Good First Issues

## Phase 5 — Monetization & Enterprise (Planned)

- Managed cloud hosting offering (flat per-org pricing)
- Priority support & SLAs
- Enterprise compliance add-ons (SOC2 reports, DPAs, dedicated data residency)

## Active work & next priorities

- **Live Demo Instance** — deploy an auto-resetting demo instance
- **Visual README** — high-res screenshots and feature GIFs
- **Documentation site** — dedicated docs site (Starlight) — this site
- **Real-time collaborative Wiki/Docs** — upgrade the docs module to Yjs/CRDT-based collaborative editing

## Competitor-inspired features roadmap

Researched from top open-source PM/ERP repos (Plane, Huly, ERPNext, OpenProject, Leantime, Focalboard):

| Feature | Inspired by | Status |
|---|---|---|
| Sprints / Cycles API + UI | Plane | ✅ Done |
| Sprint retrospectives API + UI | Leantime | ✅ Done |
| Project Milestones API + UI | Plane / OpenProject | ✅ Done |
| Task dependencies API + UI | OpenProject | ✅ Done |
| Gantt / timeline view | OpenProject | ✅ Done |
| Task checklists | Plane / Trello | ✅ Done |
| Task worklogs / time tracking | OpenProject / Plane | ✅ Done |
| Two-way GitHub sync | Huly & Plane | ✅ Done |
| Custom fields / metadata-driven forms | ERPNext DocTypes | ✅ Done |
| Real-time collaborative Wiki/Docs | Plane & Huly | Not started |

**Suggested build priority:** Real-time Wiki upgrade → Live Demo → Visual README → Documentation site → Public Launch Push.
