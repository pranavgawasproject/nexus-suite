# Contributing to Nexus Suite

Thanks for your interest in contributing! Nexus Suite is an all-in-one, modular, open-source enterprise project management platform — built so teams only turn on the modules they actually need.

## Ways to Contribute

- **Bug reports** — open an issue with steps to reproduce
- **Feature requests** — open an issue describing the use case (check `status/PROJECT_STATUS.md` first to see what's already planned)
- **Code** — pick an open issue, especially ones tagged `good first issue`, or check `status/PROJECT_STATUS.md` → "Needs Fixing" / "Future" sections for unclaimed work
- **Docs** — README clarity, setup instructions, architecture notes

## Development Setup

```bash
git clone https://github.com/pranavgawasproject/nexus-suite.git
cd nexus-suite
bun install
cp .env.example .env
bun run db:push      # or your project's Prisma migrate command
bun run db:seed       # seeds a demo org
bun run dev
```

## Project Structure

See `README.md` for the full architecture overview, and `docs/PRD.md` for the product spec behind each module.

## Module Development Guidelines

Since this project is built around a **modular toggle architecture**, when adding or editing a module:

1. New modules should depend only on **Core** (auth, org, users, RBAC, notifications) — never hard-depend on another optional module. If richer behavior is possible with another module enabled, implement it as an optional soft-link with a graceful fallback when that module is off.
2. All module API routes must be namespaced (e.g. `/api/<module>/*`) and gated with the `requireModule()` middleware so disabled modules correctly return `403 Module Not Enabled`.
3. All create/update endpoints should validate input with `zod` via the `parseBody()` / `parseQuery()` helpers.
4. Respect row-level multi-tenancy — every new table needs an `orgId` column, and every query must be scoped to it. Add or extend tests in `tests/tenant-isolation.test.ts` for new tables.
5. Update `status/PROJECT_STATUS.md` if your change completes or changes the status of a roadmap item.

## Pull Requests

- Keep PRs focused — one module/feature/fix per PR where possible
- Include a short description of what changed and why
- Make sure `bun run build` and the test suite pass before opening a PR

## Code of Conduct

This project follows the [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you agree to uphold it.

## Questions?

Open a Discussion or an Issue — happy to help you get oriented.

---

## Good First Issues

Looking for a place to start? These are concrete, scoped tasks that are great for first-time contributors. Each one is small enough to finish in a few hours.

### Frontend (React + Tailwind + shadcn/ui)
- [ ] **Sign-in page styling** — the current `/signin` page uses plain Tailwind classes. Refactor to use shadcn/ui `Card`, `Input`, `Button`, `Label` components for consistency with the rest of the app. File: `src/app/signin/page.tsx`
- [ ] **Empty states** — several module views (Risk, Governance, Docs) show plain "No X yet" text. Replace with illustrated empty states (use `lucide-react` icons + shadcn `Card`).
- [ ] **Dark mode audit** — toggle dark mode and walk through every view. Fix any contrast issues. Most components work, but custom styles in `gantt-view.tsx` and `risk-view.tsx` may need adjustments.
- [ ] **Mobile responsiveness** — test all views on mobile widths (375px). The Kanban board and Gantt view likely need horizontal scroll or a stacked layout.

### Backend (TypeScript + Prisma + Next.js API routes)
- [ ] **Add `GET /api/v1/leaves` to public API** — the internal API exists at `/api/leaves`; add a public-API wrapper at `/api/v1/leaves` with API-key auth (follow the pattern in `/api/v1/tasks/route.ts`).
- [ ] **Webhook delivery retries UI** — add a "Recent deliveries" tab to the API Keys & Webhooks view showing the last 20 deliveries from `WebhookDelivery` table.
- [ ] **CSV export for Risk register** — the Risk module has JSON/CSV export wired for tasks/budget/etc. Add Risk + Issues + Change Requests to `/api/export`.
- [ ] **Audit log filtering** — add date-range + actor filters to `/api/audit` GET endpoint and the audit-view UI.

### Tests
- [ ] **Public API tests** — write unit tests for `/api/v1/projects`, `/api/v1/leaves`, `/api/v1/risks` following the pattern in `tests/public-rooms.test.ts`.
- [ ] **E2E test for sign-in flow** — use Playwright to test the full sign-in → dashboard flow with demo credentials.
- [ ] **Custom fields tests** — write tests for `/api/custom-fields` CRUD following `tests/cycles.test.ts` pattern.

### Docs
- [ ] **API.md sync** — `docs/API.md` is out of sync with the 28+ public API endpoints. Run `ls src/app/api/v1/` and document each one.
- [ ] **Architecture diagram** — create a Mermaid diagram showing the module architecture (Core + 10 modules + Public API + Webhooks + AI). Add to `docs/ARCHITECTURE.md`.
- [ ] **Self-hosting video** — record a 2-minute Loom showing `docker compose up` → first load → demo login. Embed in README.

### How to claim
1. Comment on the issue or open a new one saying "I'd like to work on this"
2. Fork the repo, create a branch (`feat/my-feature` or `fix/my-bugfix`)
3. Make your changes — run `bun run lint && bun run typecheck && bun run test` before committing
4. Open a PR referencing the issue (e.g. `Closes #123`)

We'll review within 48 hours. Be kind, ask questions, and welcome to the project! 🎉
