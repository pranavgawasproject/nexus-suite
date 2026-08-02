---
title: Contributing
description: How to contribute to Nexus Suite.
---

PRs are welcome. Nexus Suite ships as a solo-maintained open-source project, and growing the contributor base is an explicit Phase 4 goal.

## Getting started

1. Read [`CONTRIBUTING.md`](https://github.com/pranavgawasproject/nexus-suite/blob/main/CONTRIBUTING.md) for setup, coding conventions, and PR expectations.
2. Read the [`CODE_OF_CONDUCT.md`](https://github.com/pranavgawasproject/nexus-suite/blob/main/CODE_OF_CONDUCT.md).
3. Look for issues labeled **Good First Issue** — a set of concrete, scoped starter tasks is maintained specifically for new contributors.
4. Fork, branch, and open a PR against `main`.

## Local development

```bash
git clone https://github.com/pranavgawasproject/nexus-suite.git
cd nexus-suite
bun install
cp .env.example .env
bun run db:push
bun run dev
```

## Running tests

```bash
bun run test
```

Tenant-isolation tests in particular (`tests/tenant-isolation.test.ts`) are load-bearing for the row-level multi-tenancy model — see [Architecture](/architecture/) for context.

## Where to ask questions

GitHub Issues and Discussions are the primary channels while the project is in Phase 4 (community-building). See the [Roadmap](/roadmap/) for what's planned next if you're looking for a bigger project to pick up.
