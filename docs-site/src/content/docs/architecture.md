---
title: Architecture
description: How Nexus Suite's modular toggle system, multi-tenancy, and tech stack fit together.
---

## Modular toggle system

Every module is a self-contained unit with its own database schema, API routes, and UI section, sharing only a common Core (users, org structure, auth, notifications, audit log, search). Disabled-module endpoints return `403 Module Not Enabled` (not `404`), so integrations can distinguish "this doesn't exist" from "this org hasn't turned it on."

## Multi-tenancy

Nexus Suite uses **row-level multi-tenancy** — an `orgId` column on every table — rather than schema-per-tenant. This was chosen for solo-dev operational simplicity (simpler backups, simpler ops), enforced via strict query-middleware tenant scoping. For self-hosted, single-tenant installs this distinction mostly doesn't matter; it becomes relevant primarily for a managed multi-org hosting offering.

Tenant isolation is covered by 17 automated tests (`tests/tenant-isolation.test.ts`) checking `orgId` coverage, cross-org leak prevention, and audit/notification integrity.

## Core (always-on) system

| Component | Description |
|---|---|
| Auth & SSO | Email/password, Google/Microsoft OAuth, 2FA (TOTP), SAML 2.0 + OIDC |
| Org & Team Structure | Companies → Departments → Teams → Users |
| RBAC | Admin, Manager, Employee, Guest/Client |
| Notifications Engine | Central cross-module service — deduplication, digest mode, per-user quiet hours, per-module mute controls |
| Global Search | Cross-module search |
| Audit Log | Who changed what, when |
| Module Marketplace | Enable/disable modules per org |
| i18n / Localization | UI string externalization, UTC storage with locale-aware rendering |
| Self-host deployment kit | Docker Compose + one-command installer |

## Tech stack

- **Framework:** Next.js 16 (App Router, Turbopack) + TypeScript 5
- **Database:** Prisma ORM + SQLite (default) / PostgreSQL (production) — swap via `DATABASE_URL`
- **UI:** Tailwind CSS 4 + shadcn/ui (New York style) + Recharts + dnd-kit + Framer Motion
- **Auth:** NextAuth.js v4 (Credentials provider, JWT sessions, bcrypt-hashed passwords)
- **State:** Zustand (client) + TanStack Query (server)
- **Validation:** zod on every API request body
- **Runtime:** Bun (dev + scripts), Node.js (production standalone build)

## Public API

RESTful `/api/v1/*` with API-key auth (read/write/webhooks scopes) and HMAC-signed webhooks with retry-with-backoff. See the [Public API reference](/api/) for full endpoint documentation.

## AI integration

Nexus Suite ships AI features as part of the free, open-source core (not gated behind a paid tier): natural-language task creation, task summarization, budget anomaly detection, AI dashboard insights, and an AI admin copilot for governance/compliance checks and KPI suggestions.
