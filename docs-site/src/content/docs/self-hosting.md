---
title: Self-hosting (Production)
description: Production setup with PostgreSQL, nightly backups, and a reverse proxy.
---

Nexus Suite is 100% free and open-source under AGPL-3.0. Self-host it forever — no per-user fees, no feature gating, no trial expiry.

## Production setup (PostgreSQL + nightly backups)

```bash
git clone https://github.com/pranavgawasproject/nexus-suite.git
cd nexus-suite

# Generate secrets
export NEXTAUTH_SECRET=$(openssl rand -base64 32)
export POSTGRES_PASSWORD=$(openssl rand -base64 24)
export NEXTAUTH_URL=https://nexus.yourdomain.com

# Override DATABASE_URL to use Postgres
export DATABASE_URL="postgresql://nexus:${POSTGRES_PASSWORD}@postgres:5432/nexus"

# Boot with the postgres profile
docker compose --profile postgres up -d --build
```

This brings up:

- `nexus` — the app on port 3000
- `postgres` — Postgres 17 on port 5432 (internal)
- `pg-backup` — nightly `pg_dump` at 02:00, 30-day retention

Put a reverse proxy (Caddy, Traefik, nginx) in front for TLS — example Caddyfile:

```
nexus.yourdomain.com {
    reverse_proxy nexus:3000
}
```

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `DATABASE_URL` | `file:/app/data/nexus.db` | Prisma datasource. SQLite path or `postgresql://...` |
| `NEXTAUTH_SECRET` | (none — **must set in prod**) | HMAC secret for session tokens |
| `NEXTAUTH_URL` | `http://localhost:3000` | Canonical app URL (must match your reverse proxy) |
| `NEXUS_AUTO_SEED` | `true` | Whether to seed demo data on first boot. Set to `false` for production. |
| `NEXUS_PORT` | `3000` | Host port to map |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | `nexus` / `nexus` / `nexus` | Postgres creds (postgres profile only) |
| `POSTGRES_PORT` | `5432` | Host port for Postgres (postgres profile only) |

## Updating

```bash
git pull
docker compose up -d --build
```

The container runs `prisma db push` on every boot — schema migrations are applied automatically.

## Backups

- **SQLite profile:** back up the `nexus-data` Docker volume (`/var/lib/docker/volumes/nexus-suite_nexus-data/_data` on the host).
- **Postgres profile:** the `pg-backup` sidecar writes daily dumps to the `nexus-pg-backups` volume. Restore with:

  ```bash
  gunzip -c /backups/dump.sql.gz | docker exec -i nexus-postgres psql -U nexus nexus
  ```

## Uninstall

```bash
docker compose down -v   # -v also deletes volumes — destroys all data
```

## Troubleshooting

**`Cannot find module '.prisma/client'`** — Prisma client wasn't generated. Run `docker compose build --no-cache nexus` to rebuild.

**First boot is slow** — the image runs `prisma db push` and seeds demo data on the first HTTP request to `/api/session`. Subsequent requests are fast.

**Port 3000 already in use** — set `NEXUS_PORT=3001` (or any free port) in your environment.

## License

Nexus Suite is licensed under [AGPL-3.0](https://github.com/pranavgawasproject/nexus-suite/blob/main/LICENSE). You're free to self-host, modify, and redistribute — including commercially — provided you keep the source open if you expose the service to users over a network (per AGPL §13).
