# LibraryCraft — Progress

Claude Code: read this file at the start of every session and update it at the end.

## Phases

- [x] Phase 1 — Foundation (scaffold, auth, workspaces, tenancy)
- [ ] Phase 2 — Catalogue (ISBN lookup, shelves, books, browse)
- [ ] Phase 3 — Scanning + PWA
- [ ] Phase 4 — Lending (borrowers, loans, reminders cron)
- [ ] Phase 5 — Billing (Stripe, plan limits, members)
- [ ] Phase 6 — Launch (marketing site, hardening, Docker, CI, deploy)

## Current status

Phase 1 done. Next: Phase 2 (Catalogue). lint, typecheck, 16 unit/integration tests and 4 Playwright tests pass; `pnpm build` succeeds.

## Decisions log

| Date | Decision |
| --- | --- |
| 2026-11-26 | Name: LibraryCraft. Domain: librarycraft.aakasa.dev |
| 2026-11-26 | Multi-tenant SaaS modelled on BillCraft AI; Stripe billing |
| 2026-11-26 | Host on Vercel initially (Pro before charging); Neon Postgres in production; keep Dockerfile for a later VPS move |
| 2026-11-27 | Next.js 16.4 with `cacheComponents` and `partialPrefetching` off: nearly every route reads the session, so each would need a Suspense boundary for little gain. Dev indicator off because it covers the mobile bottom nav. |
| 2026-11-27 | Auth.js v5 (`next-auth@5.0.0-beta.32`) with database sessions. Google is enabled only when its env vars are set. Without `RESEND_API_KEY` in dev, magic links are printed to the server console. |
| 2026-11-27 | Prisma pinned to 7.10.1 (npm `latest` for `prisma` is an 8.0 RC). Prisma 7 setup: `prisma.config.ts`, `prisma-client` generator → `prisma/generated` (gitignored, built on postinstall), `@prisma/adapter-pg`. Package is `"type": "module"`. |
| 2026-11-27 | Schema staged: only the Phase 1 models are migrated. Later models live in `prisma/schema-later.prisma.txt`. Move them in per phase, restore the Workspace back-relation, and add each tenant model to `TENANT_MODELS` in `lib/db/tenant.ts`. |
| 2026-11-27 | Tenancy: `getTenantDb` is a Prisma `$extends` query extension that injects `workspaceId` into where/data. Callers must use scalar FKs (not relation `connect`). Global models throw through it. |
| 2026-11-27 | Tests use the separate `librarycraft_test` DB (`DATABASE_URL_TEST`), prepared with `migrate deploy` + seed. Not reset: tests use unique random data. E2E "mocks the provider" by inserting User + Session rows and setting the `authjs.session-token` cookie. |
| 2026-11-27 | Pro plan maxMembers set to 2 (spec only says Family has 6); Free includes the `coverScan` feature since it gets 10 scans/month. Revisit in Phase 5. |

## Session notes

<!-- Newest first. One short entry per session: what was done, what's next, blockers. -->

### 2026-11-27 — Phase 1 (Foundation)
- Scaffolded Next 16 + TS strict + Tailwind 4 + ESLint 9 + Vitest 5 + Playwright 1.65 (pnpm).
- Prisma 7 config, `init` migration (User, Account, Session, VerificationToken, Workspace, WorkspaceMember, Plan, Subscription) and a seed of the four plans.
- `lib/env.ts` (zod), `lib/db/{client,tenant,workspaces}.ts`, `lib/auth/{config,guards}.ts`, `lib/billing/limits.ts` (`member` kind only for now).
- Pages: sign-in (Google + magic link), verify, onboarding (name → slug, Free plan, OWNER membership), `/[workspace]` shell with switcher and bottom nav, plus placeholder Books/Scan/Loans/Settings pages (Settings has sign out).
- Tests: tenancy isolation, guards, slugify/createWorkspace, plan member limit; e2e for the sign-in redirect, magic-link request, onboarding → dashboard at 375 px with 44 px nav targets, and a 404 on a foreign workspace.
- Next: Phase 2. Add `'copy'` to `assertWithinPlan`, add the demo workspace to the seed, and move the catalogue models in from `schema-later.prisma.txt`.
- Not done: Dockerfile/CI (Phase 6). No git commit made yet.
