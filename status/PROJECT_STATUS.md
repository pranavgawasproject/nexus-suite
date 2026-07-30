# Nexus Suite — Project Status

> **This file is the single source of truth for "where things actually stand."**

**Last reviewed:** 2026-07-30
**Reviewed by:** Grok (autonomous daily maintainer)

## Track A (this run): Task subtasks via parentId

**Code files changed:** `src/lib/schemas.ts`, `src/app/api/tasks/route.ts`, `tests/task-subtasks.test.ts`, `package.json`, `.github/workflows/test-ci.yml`, `status/PROJECT_STATUS.md`

- Wired existing `Task.parentId` column through zod schemas (`create` / `update` / query)
- `/api/tasks` POST/PATCH validate parent (same org + project, one nesting level, no self-parent)
- GET supports `parentId` / `parentId=none` (top-level only) and returns `subtaskCount`
- DELETE of a parent orphans children (clears their parentId) instead of cascading delete
- Unit tests + `test:subtasks` wired into `test:all` and CI

## Previous Track A: Task worklogs / time tracking

- `TaskWorklog` model, `/api/worklogs`, UI in task detail, tests + CI

## Previous Track A: Task checklists

- `TaskChecklistItem` model, `/api/checklists`, UI, tests + CI

## ✅ Completed
- Enhanced /api/health with Prisma ping and module stats
- CSV import API + wizard UI for tasks
- Cycles / Sprints schema + API + UI + kanban filter
- Sprint retrospectives API + UI
- Task comments, milestones, dependencies, Gantt view
- Task checklists and worklogs / time tracking
- **Task subtasks (parentId)** — schemas + API validation + list filter + subtaskCount + tests/CI

## 🔧 Needs Fixing
- (none critical)
- UI: expose parent selector / nested list in TasksView (API ready; UI polish next)
- After pull: `bun run db:push` if local SQLite lags schema (parentId already on Task)

## 🚀 Future Plan

**Vision:** Become the #1 most-starred, most-forked open-source AI + ERP/PM platform on GitHub, and get accepted into GitHub Sponsors.

### Phase 1 — Core Product (in progress)
- [x] Task subtasks API (parentId)
- [ ] Task subtasks UI in TasksView (parent picker + nested display)
- [ ] Polish self-host deploy kit (Docker Compose one-command installer, docs)
- [x] Cycles, retrospectives, comments, milestones, dependencies, Gantt, checklists, worklogs

### Phase 2 — AI Integration
- [ ] AI-assisted task/project creation and summarization
- [ ] AI-powered reporting & analytics insights
- [ ] AI copilot for admins

### Phase 3 — Growth & Community
- [ ] Public launch push (Reddit, HN, Product Hunt)
- [ ] Polished README, demo video/GIFs, live demo instance
- [ ] GitHub Sponsors acceptance
- [ ] Grow contributor base

### Phase 4 — Monetization (open-core)
- [ ] Managed hosting offering
- [ ] Support SLAs
- [ ] Compliance add-ons

## 🏆 Competitor-Inspired Features (Future)

- [x] Sprints / Cycles, retrospectives, milestones, dependencies, Gantt, checklists, worklogs
- [x] **Subtasks (parentId)** — API + schemas (inspired by Plane / Asana)
- [ ] Subtasks UI polish
- [ ] **Two-way GitHub sync** (inspired by Huly & Plane)
- [ ] **Real-time collaborative Wiki/Docs** (Yjs/CRDT)
- [ ] **Custom fields / metadata-driven forms** (inspired by ERPNext DocTypes)

**Suggested build priority:** Subtasks UI → GitHub sync → Wiki upgrade → Custom fields → self-host polish.
