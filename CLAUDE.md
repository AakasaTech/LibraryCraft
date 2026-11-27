# CLAUDE.md — LibraryCraft

LibraryCraft is a multi-tenant SaaS for cataloguing home and small-organisation libraries: scan ISBNs (or covers) to add books, organise them on shelves, and track lending. It is an Aakasa Digital product, served at **librarycraft.aakasa.dev**.

Read `docs/SPEC.md` for the product spec. Read `docs/PROGRESS.md` at the start of every session to see which phase is in progress, and update it at the end.

## Stack

- **Next.js (App Router) + TypeScript (strict) + Tailwind CSS**, installable as a PWA
- **PostgreSQL + Prisma.** Local dev uses Docker Postgres (`docker compose up -d`); production uses Neon.
- **Auth.js:** Google OAuth plus email magic links sent through Resend
- **Stripe:** Checkout, Customer Portal and webhooks for subscriptions
- **Resend** for all transactional email
- **Barcode scanning:** browser `BarcodeDetector`, with `@zxing/browser` as the fallback
- **ISBN metadata:** Open Library first, Google Books as the fallback, cached in the `Edition` table
- **Hosting:** Vercel. Vercel Cron runs scheduled jobs. Keep a working `Dockerfile` so the app can move to a VPS later.
- **Package manager:** pnpm. **Tests:** Vitest for unit tests, Playwright for end-to-end flows.

Before adding or upgrading a dependency, check its current docs. Don't rely on memory for API shapes in Next.js, Auth.js, Prisma or Stripe, because they change between major versions.

## Non-negotiable rules

1. **Tenancy.** Every tenant-owned model has `workspaceId`. Every read and write goes through `lib/db/tenant.ts` (`getTenantDb(workspaceId)`), which scopes queries automatically. Never call the raw Prisma client for tenant data in route handlers, server actions or components. `Edition`, `User` and `Plan` are the only global models.
2. **Authorisation.** Server actions and route handlers resolve the session, then the active workspace membership and role, before doing anything. Use `requireMember(role?)` from `lib/auth/guards.ts`.
3. **Plan limits.** Any action that creates a Copy, a WorkspaceMember or a cover scan calls `assertWithinPlan(workspaceId, kind)` from `lib/billing/limits.ts` first.
4. **Stripe is the source of truth** for subscription state. Only the webhook handler writes to `Subscription`. Verify webhook signatures and make the handler idempotent.
5. **No secrets in code.** Read config through `lib/env.ts`, which validates it with zod. Add every new variable to `.env.example`.
6. **Mobile first.** Design every screen at 375 px wide first, then scale up. Make tap targets at least 44 px.

## Project layout

```
app/
  (marketing)/           landing, pricing — public
  (auth)/                sign-in, verify
  (app)/[workspace]/     the product, scoped by workspace slug
    books/  shelves/  scan/  loans/  borrowers/  settings/  billing/
  api/
    webhooks/stripe/     Stripe webhook
    cron/reminders/      daily overdue reminders (Vercel Cron)
lib/
  db/        prisma client, tenant.ts
  auth/      Auth.js config, guards.ts
  billing/   stripe.ts, plans.ts, limits.ts
  isbn/      lookup.ts (Open Library → Google Books → cache), isbn.ts (validate/convert)
  email/     resend.ts + React Email templates
  env.ts
components/  ui/ (primitives), feature folders mirror app/
prisma/      schema.prisma, seed.ts (plans + demo workspace)
docs/        SPEC.md, PROMPTS.md, PROGRESS.md
```

## Conventions

- Prefer server components and server actions. Use client components only for interactivity, such as the scanner and forms.
- Validate every server action's input with zod schemas kept next to the action.
- Money is stored in minor units (integer cents), and dates in UTC.
- Use `kebab-case` for file names, `PascalCase` for components, and `camelCase` for everything else.
- Error messages shown to users are plain English with no stack traces. Log details server-side.
- Name commits in the Conventional Commits style (`feat:`, `fix:`, `chore:`).

## Commands

```
pnpm dev                 # start the dev server
docker compose up -d     # local Postgres
pnpm prisma migrate dev  # apply schema changes
pnpm prisma db seed      # seed plans + demo data
pnpm test                # vitest
pnpm test:e2e            # playwright
pnpm lint && pnpm typecheck
```

## Definition of done (every phase)

- `pnpm lint`, `pnpm typecheck` and `pnpm test` all pass.
- New logic has unit tests. Each main user flow has at least one Playwright test.
- A tenancy test proves that workspace A cannot read workspace B's data for any new model.
- `docs/PROGRESS.md` is updated with what was done, what's next, and any decisions made.
