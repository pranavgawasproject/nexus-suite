
---

## 8. 🔍 Functionality-Wise Status (code-level audit, 2026-07-23)

> **Methodology note:** This section is based on reading actual source code via the GitHub API (not a live `npm run build` / click-through test — that's not possible from this environment since GitHub's git/tarball hosts aren't reachable from the sandbox used to write this). "Verified" below means "the code was read and the logic is real, complete, and internally consistent" — not "it was executed and confirmed to run." Treat this as a strong code review, not a QA sign-off. Item 4.3 ("actually run docker compose yourself") in Section 4 is still the real verification step.

### Legend
- ✅ **Verified working** — code read, logic is real and complete
- ⚠️ **Present but unverified** — code exists and looks reasonable, but has a noted caveat or hasn't been exercised
- ❌ **Known broken/blocked** — confirmed issue

### Core Infrastructure
| Feature | Status | Notes |
|---|---|---|
| Module toggle + `403 Module Not Enabled` enforcement | ✅ | `requireModule()` in `api-guard.ts`; `module-gate.test.ts` explicitly tests disable→403→re-enable→200 cycle against live endpoints |
| Input validation (Zod) | ✅ | `schemas.ts` (15.4KB — substantial, covers all modules); gate test confirms 400s on missing fields, bad color format, invalid time ranges |
| Tenant isolation | ✅ (code-level) | 17-test suite in `tenant-isolation.test.ts`, included in `npm test` / `test:all` — this one **does** run automatically |
| Auth (NextAuth) | ⚠️ | Code present (`src/lib/auth`, credentials provider, bcrypt); not yet confirmed to actually authenticate end-to-end in a running instance |
| Public API v1 + API keys | ⚠️ | `public-api.ts` (6.7KB) + `/api/v1` routes exist; no confirmed live request/response test |
| Webhooks | ⚠️ | `webhooks.ts` (6.4KB), HMAC signing + retry logic present; **not wired to a scheduler**, so retries won't fire automatically in production as-is |
| Module-gate test suite | ⚠️ | Real, well-written test (`module-gate.test.ts`) — but requires a live dev server on `localhost:3000` to run, and is **not** included in `test:all` in package.json, only `test:tenant` is. So this test exists but doesn't run in CI/automated checks by default. |

### Module 5 — Budget (GST + Multi-currency) — spot-checked in depth given real-world stakes
| Feature | Status | Notes |
|---|---|---|
| CGST/SGST split (intra-state) | ✅ | `computeGst()` correctly halves the rate between CGST/SGST for intra-state supply |
| IGST (inter-state) | ✅ | Correctly applies full rate as IGST for inter-state supply |
| HSN/SAC rate lookup | ✅ | Exact match + progressive prefix matching (8→6→4 chars), reasonable default rate table for common IT/hardware codes |
| FX conversion | ⚠️ **Self-flagged by the code itself** | Uses **static, hardcoded FX rates** (e.g. USD=83.5 INR) with a code comment explicitly warning: *"In production, fetch from RBI or a paid FX API daily. These are placeholder rates for offline functionality."* This will silently drift from real exchange rates over time — fine for demo/dev, **not safe for real invoicing** until wired to a live rate source. |
| GST rate accuracy | ⚠️ **Self-flagged by the code itself** | Comment explicitly states: *"This is a simplified engine — production use should integrate with a proper GST engine (ClearTax/Zoho Books APIs) before filing returns."* Good that this is honestly documented, but means **real GST filings should not rely on this module as-is**. |

### All 10 Modules — API surface
- ✅ **29 API route groups confirmed present** on disk: ai, allocations, api-keys, attendance, audit, auth, bookings, budgets, change-requests, dashboard, documents, expenses, export, holidays, issues, kras, leaves, modules, notifications, onboarding, policies, projects, risks, rooms, search, session, tasks, team, v1, webhooks — this maps cleanly to all 10 PRD modules + Core + AI + public API.
- ⚠️ Route *presence* confirmed; **not every route's internal logic was individually read** in this pass (only Budget/GST was spot-checked in depth per the risk flagged in Section 4). Recommend the same depth of review for Module 2 (KRA/KPA) and Module 10 (Governance) next, since those also carry real correctness/compliance stakes if self-hosted for actual business use.

### Build & Test Tooling
| Script | Status | Notes |
|---|---|---|
| `npm run build` | ⚠️ unverified | Script exists (`next build` + standalone copy steps), not executed in this audit (no network path to build in this environment) |
| `npm run test` / `test:all` | ⚠️ partial | Only runs `test:tenant` (17 tests) — `test:gate` (module-gate/validation tests) is a separate, uncombined script requiring a live server |
| `npm run typecheck` / `lint` | ⚠️ unverified | Scripts present, not executed |
| CI (GitHub Actions) | ❌ blocked | Confirmed blocked on token `workflow` scope (Section 3) — so none of the above run automatically on push/PR right now |

### Bottom line
**The code is real, not stubbed** — this is a meaningfully positive finding; the automation has been building genuine, working logic, and even self-documenting its own limitations honestly (the GST/FX caveats are a good sign of careful implementation, not corner-cutting). The gap is entirely in **verification**, not construction: nothing has been confirmed to actually build/run/pass tests end-to-end yet, because (a) CI is blocked and (b) this audit environment can't reach GitHub's build/clone endpoints. **Fixing the CI token scope (Section 3/4) is now the single highest-leverage next step** — it would make every future review able to show real green/red test results instead of a code-reading approximation like this one.
