---
title: Quickstart
description: Get Nexus Suite running in about 2 minutes with Docker.
---

## Self-host (2 minutes)

```bash
git clone https://github.com/pranavgawasproject/nexus-suite.git
cd nexus-suite

export NEXTAUTH_SECRET=$(openssl rand -base64 32)

docker compose up -d --build
# Open http://localhost:3000 — done.
```

The first request auto-seeds a demo org ("Acme Design Studio") with 5 users, 3 projects, 12 tasks, 4 rooms, 7 bookings, plus sample data for every other enabled module. Log in with any demo user (e.g. `priya@acme.test`) — passwords aren't enforced in the demo flow.

For a production setup with PostgreSQL, nightly backups, and a reverse proxy, see [Self-hosting (Production)](/self-hosting/).

## Local development

```bash
bun install
cp .env.example .env
bun run db:push     # apply schema + seed demo data
bun run dev         # http://localhost:3000
```

## Requirements

- Docker + Docker Compose (for self-hosting)
- Bun (for local development) — Node.js is used for the production standalone build

## Next steps

- Browse the [Modules](/modules/) available and what each one does
- Read the [Architecture](/architecture/) overview to understand how the modular toggle system works
- Check the [Public API reference](/api/) if you want to integrate or automate against Nexus Suite
