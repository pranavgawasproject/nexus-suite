---
title: Business Model — Open-Core
description: Why Nexus Suite is open-core rather than freemium, and what stays free forever.
---

Nexus Suite is **open-core**, not freemium. Per [PRD v2.1 §6](https://github.com/pranavgawasproject/nexus-suite/blob/main/docs/PRD.md), the free tier is genuinely complete — not a crippled trial.

## Why open-core, not per-module SaaS pricing

Companies pay premium prices for closed-source/SaaS tools not primarily for the software's features, but for three things open-source has traditionally failed to provide:

1. **Zero implementation friction** — sign up and be running same-day, no server/DevOps ownership required
2. **Risk transfer** — a vendor who is contractually and legally on the hook when something breaks, holds compliance certifications, and provides an SLA
3. **Dedicated support** — someone to call, not a GitHub issue queue

A free-but-unsupported open-source tool doesn't remove these barriers, it just makes the software free while leaving all three in place. Nexus Suite's business model sells *those three things specifically*, while keeping 100% of the software free, open-source, and self-hostable forever — the same structural approach used by GitLab and Mattermost in the open-core category.

## What stays free and open-source forever

- All 10 modules, full feature set, no artificial gating
- Full public API and webhooks, unlimited on self-hosted installs
- Full data export/import, unlimited users, unlimited orgs
- Self-host deployment kit (Docker Compose, one-command installer, documentation)

**Hard rule:** paid tiers only ever sell hosting, support, and compliance — never module features. Bait-and-switch kills community trust.

## What's paid

| Offering | What it sells | Why it's worth paying for |
|---|---|---|
| **Managed Cloud Hosting** | We host it for you — infra, backups, upgrades, uptime SLA | Removes implementation friction entirely |
| **Support Plans** | Guaranteed response times, direct support channel, onboarding assistance | Removes the "no dedicated support" barrier |
| **Compliance Add-ons** | SOC2 report access, signed DPAs, pen-test reports, dedicated data residency | Removes the compliance/liability barrier |
| **Enterprise Managed Multi-Org** | Multi-entity management, custom SLAs, dedicated infrastructure | For enterprises whose scale genuinely requires dedicated resources |

## Indicative pricing (subject to benchmarking)

| Tier | Price | Includes |
|---|---|---|
| **Self-Hosted (Community)** | Free forever | All 10 modules, full features, unlimited users, community support |
| **Managed Cloud — Starter** | Flat monthly rate | Fully hosted, daily backups, standard support |
| **Managed Cloud — Business** | Flat monthly rate | + Priority support (SLA-backed), staging environment |
| **Managed Cloud — Enterprise** | Custom quote | + SOC2/compliance package, dedicated infra, custom SLA |

Pricing is flat and organizational rather than per-user — charging per-seat for a "free and open-source" product sends a mixed message, and flat tiers keep cost predictable for the budget-conscious SMEs this project targets.

## Sequencing

Nobody pays for hosting of a project they've never seen self-hosted successfully by others. The plan:

1. Ship modules fully free and open-source (done — Phases 1 & 2 complete)
2. Build genuine self-host adoption and community trust
3. Launch Managed Cloud Hosting once there's a track record of the self-hosted product working reliably for real orgs
4. Compliance/Enterprise add-ons only once there's inbound demand from an actual prospect

See the [Roadmap](/roadmap/) for where each phase currently stands.
