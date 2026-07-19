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
