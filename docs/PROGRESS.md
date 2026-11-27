# LibraryCraft — Progress

Claude Code: read this file at the start of every session and update it at the end.

## Phases

- [x] Phase 1 — Foundation (scaffold, auth, workspaces, tenancy)
- [x] Phase 2 — Catalogue (ISBN lookup, shelves, books, browse)
- [ ] Phase 3 — Scanning + PWA
- [ ] Phase 4 — Lending (borrowers, loans, reminders cron)
- [ ] Phase 5 — Billing (Stripe, plan limits, members)
- [ ] Phase 6 — Launch (marketing site, hardening, Docker, CI, deploy)

## Current status

Phases 1–2 done. Next: Phase 3 (Scanning + PWA). lint, typecheck, 46 unit/integration tests and 6 Playwright tests pass; `pnpm build` succeeds.

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
| 2026-11-27 | CopyTag has `workspaceId` (rule 1). Edition has `authorsText` (lower-cased joined authors) for partial author search. |
| 2026-11-27 | Google Books' keyless quota is 0 (429), so the fallback runs only when `GOOGLE_BOOKS_API_KEY` is set. |
| 2026-11-27 | Shared-catalogue rule: a manual entry with an ISBN first tries the catalogues; a MANUAL Edition claims an ISBN only when both miss. Users edit their Copy, never an Edition. Seed demo books have no ISBN, so they never shadow real lookups. |
| 2026-11-27 | Parent IDs sent by clients (shelfId, roomId, bookcaseId) are always resolved through `getTenantDb` before use (`resolveShelfId` in lib/catalogue/copies.ts). A foreign ID becomes "not found". |
| 2026-11-27 | Covers are hot-linked with plain `<img>` (Open Library covers redirect across hosts). Reorder is ↑/↓ buttons, not drag. Deleting a room or bookcase is blocked while any of its shelves hold books. |
| 2026-11-27 | Prisma 7 `migrate dev` no longer runs `generate`: run `pnpm prisma generate` after every migration. |
| 2026-11-27 | E2E runs against `next build && next start` (cold dev routes timed out), with 3 workers, a 60 s test timeout and a 15 s expect timeout, because this Windows machine is slow under load. `AUTH_EMAIL_TO_CONSOLE=1` makes production-mode e2e log magic links instead of calling Resend. |

## Session notes

<!-- Newest first. One short entry per session: what was done, what's next, blockers. -->

### 2026-11-27 — Phase 2 (Catalogue)
- `catalogue` migration: Edition, Copy, Room, Bookcase, Shelf, Tag, CopyTag; all tenant models added to `TENANT_MODELS`.
- `lib/isbn/isbn.ts` (normalize, validate, convert, parse) and `lib/isbn/lookup.ts` (DB → Open Library → Google → upsert; 5 s timeouts; failures count as a miss). A live lookup of 9780261103573 works.
- `assertWithinPlan` now covers `copy`; the limit message links to settings.
- Shelves page (tree, create/rename/↑↓/delete, move-books-then-delete) and a shelf page. Books: add by ISBN (confirmation card plus duplicate warning), manual entry, detail/edit/move/delete, browse (search, shelf and status filters, grid/list, 24 per page). The dashboard shows counts.
- Seed: a demo workspace at `/demo` (sign in as demo@librarycraft.local).
- Tests: ISBN, lookup (mocked fetch), copy limit, tenancy for every catalogue model plus the foreign-shelf check; e2e for add by ISBN → search → shelf, and move-books-then-delete.
- Next: Phase 3. The confirmation card becomes editable there, and the last-used shelf gets pre-selected.
- Not done: a tags UI (the models and tenancy are done), bulk move, stats.

### 2026-11-27 — Phase 1 (Foundation)
- Scaffolded Next 16 + TS strict + Tailwind 4 + ESLint 9 + Vitest 5 + Playwright 1.65 (pnpm).
- Prisma 7 config, `init` migration (User, Account, Session, VerificationToken, Workspace, WorkspaceMember, Plan, Subscription) and a seed of the four plans.
- `lib/env.ts` (zod), `lib/db/{client,tenant,workspaces}.ts`, `lib/auth/{config,guards}.ts`, `lib/billing/limits.ts` (`member` kind only for now).
- Pages: sign-in (Google + magic link), verify, onboarding (name → slug, Free plan, OWNER membership), `/[workspace]` shell with switcher and bottom nav, plus placeholder Books/Scan/Loans/Settings pages (Settings has sign out).
- Tests: tenancy isolation, guards, slugify/createWorkspace, plan member limit; e2e for the sign-in redirect, magic-link request, onboarding → dashboard at 375 px with 44 px nav targets, and a 404 on a foreign workspace.
- Next: Phase 2. Add `'copy'` to `assertWithinPlan`, add the demo workspace to the seed, and move the catalogue models in from `schema-later.prisma.txt`.
- Not done: Dockerfile/CI (Phase 6). No git commit made yet.
