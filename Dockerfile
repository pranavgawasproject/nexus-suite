# syntax=docker/dockerfile:1.7

# ──────────────────────────────────────────────────────────────────────────
# Nexus Suite — production image
#
# Multi-stage build:
#   1) deps       — install production deps with Bun
#   2) builder    — compile Next.js standalone output + run prisma generate
#   3) runner     — minimal runtime image with standalone server + prisma client
#
# Image is designed to run with either SQLite (default, single-volume) or
# PostgreSQL (set DATABASE_URL). See docker-compose.yml for both variants.
# ──────────────────────────────────────────────────────────────────────────

# ── Stage 1: deps ──────────────────────────────────────────────────────────
FROM oven/bun:1.3-debian AS deps
WORKDIR /app

# Install OS-level deps needed by sharp / prisma (openssl) at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests first for layer caching
COPY package.json bun.lock ./
COPY prisma ./prisma

# Install ALL deps (dev needed for build step)
RUN bun install --frozen-lockfile

# ── Stage 2: builder ───────────────────────────────────────────────────────
FROM oven/bun:1.3-debian AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time env
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generate Prisma client, then build Next.js standalone
RUN bun run db:generate
RUN bun run build

# ── Stage 3: runner ────────────────────────────────────────────────────────
FROM oven/bun:1.3-debian AS runner
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    wget \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd --system --gid 1001 nexus \
 && useradd --system --uid 1001 --gid nexus --home-dir /app --shell /bin/bash nexus

# Copy standalone Next.js output (includes minimal node_modules)
COPY --from=builder --chown=nexus:nexus /app/.next/standalone ./
COPY --from=builder --chown=nexus:nexus /app/.next/static ./.next/static
COPY --from=builder --chown=nexus:nexus /app/public ./public

# Prisma: schema + generated client
COPY --from=builder --chown=nexus:nexus /app/prisma ./prisma
COPY --from=builder --chown=nexus:nexus /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nexus:nexus /app/node_modules/@prisma ./node_modules/@prisma

# Volume for SQLite (ignored if DATABASE_URL points to Postgres)
RUN mkdir -p /app/data && chown -R nexus:nexus /app/data
VOLUME ["/app/data"]

USER nexus

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Default to SQLite in /app/data — override with DATABASE_URL=postgresql://... for managed hosting
ENV DATABASE_URL="file:/app/data/nexus.db"

# Healthcheck — hit the session endpoint (auto-seeds on first run)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget -qO- http://127.0.0.1:3000/api/session > /dev/null || exit 1

# Run migrations on container start, then start the server
CMD ["sh", "-c", "bunx prisma db push --skip-generate && node server.js"]
