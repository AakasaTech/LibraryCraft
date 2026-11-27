# LibraryCraft — Claude Code build prompts

Run one phase per Claude Code session. Paste the prompt, let it plan first (Shift+Tab into plan mode), approve the plan, then let it build. Each phase ends with passing checks and an updated `docs/PROGRESS.md`. You can also run `/next-phase` to pick up the next unchecked phase automatically. To enable it, move `docs/claude-commands/next-phase.md` into `.claude/commands/`.

---

## Phase 1 — Foundation

```
Read CLAUDE.md, docs/SPEC.md and prisma/schema.prisma.

Build Phase 1 (Foundation) of LibraryCraft:
1. Scaffold a Next.js App Router project with TypeScript (strict), Tailwind, ESLint, pnpm, Vitest and Playwright, in the current folder (keep the existing docs/, prisma/ and CLAUDE.md).
2. Add docker-compose Postgres for local dev (docker-compose.yml already exists — use it), Prisma, and lib/env.ts with zod validation driven by .env.example.
3. Use the draft prisma/schema.prisma. Migrate only the models needed now: User, Account, Session, VerificationToken, Workspace, WorkspaceMember, Plan, Subscription. Seed the four plans from docs/SPEC.md.
4. Set up Auth.js with Google and Resend magic-link sign-in.
5. Implement lib/db/tenant.ts (getTenantDb(workspaceId) that scopes every query on tenant models) and lib/auth/guards.ts (requireUser, requireMember(role?)).
6. Build: sign-in page, onboarding that creates the first Workspace (name → slug) on the Free plan, a workspace switcher, and an empty /[workspace] dashboard shell with mobile bottom nav (Books, Scan, Loans, Settings).
7. Tests: tenancy isolation test for Workspace/WorkspaceMember, guard tests, and a Playwright smoke test for sign-in (mock the provider) → onboarding → dashboard.

Plan first and show me the file list before writing code. Finish by updating docs/PROGRESS.md.
```

## Phase 2 — Catalogue

```
Read CLAUDE.md, docs/PROGRESS.md and the Catalogue parts of docs/SPEC.md.

Build Phase 2 (Catalogue):
1. Migrate Edition, Copy, Room, Bookcase, Shelf, Tag, CopyTag.
2. lib/isbn/isbn.ts: validate ISBN-10/13, convert 10→13, normalise input (strip hyphens/spaces). Full unit tests.
3. lib/isbn/lookup.ts: find Edition by ISBN in DB → else Open Library → else Google Books → save Edition (source field) → return. Timeouts, graceful failure, unit tests with mocked fetch.
4. Shelf management UI: Room → Bookcase → Shelf tree with create/rename/reorder/delete (block delete if a shelf has copies, offer "move books").
5. Books: add by typed ISBN (lookup → confirmation card → choose shelf → save Copy), manual entry form, book detail page, edit, move to shelf, delete. Duplicate warning when the workspace already has a Copy of that Edition.
6. Library browse: grid (covers) and list views, search by title/author/ISBN, filters by shelf and read status, pagination.
7. Enforce the Free plan copy limit via lib/billing/limits.ts (assertWithinPlan) with a friendly upgrade prompt.
8. Tests: tenancy test for every new model, lookup tests, Playwright: add a book by ISBN and find it on its shelf.

Plan first. Update docs/PROGRESS.md at the end.
```

## Phase 3 — Scanning + PWA

```
Read CLAUDE.md, docs/PROGRESS.md and the import/user-flow sections of docs/SPEC.md.

Build Phase 3 (Scanning):
1. Make the app an installable PWA: manifest, icons (placeholder LibraryCraft icon), service worker caching the app shell. Works on Android Chrome and iOS Safari.
2. Scanner component: camera stream with BarcodeDetector (EAN-13) and @zxing/browser fallback; torch toggle where supported; beep/vibrate on detect; ignore repeat reads of the same code for 3 seconds; camera permission error states.
3. /scan flow: scan → lookup → confirmation card (edit fields, pick shelf, last shelf pre-selected) → save → scanner stays open for the next book. Manual ISBN entry fallback on the same screen.
4. "Scan onto this shelf" mode from a shelf page: each scanned book that already exists in the workspace is moved to this shelf; unknown ISBNs go through the add flow.
5. Desktop: webcam scanning works the same; also support a USB barcode scanner (keyboard-wedge input) on the scan page.
6. Tests: unit tests for the dedupe/debounce logic; Playwright test using a fake media stream or the manual entry path.

Plan first. Update docs/PROGRESS.md at the end.
```

## Phase 4 — Lending

```
Read CLAUDE.md, docs/PROGRESS.md and the Lending sections of docs/SPEC.md.

Build Phase 4 (Lending):
1. Migrate Borrower and Loan.
2. Borrowers: list, create, edit, detail page with loan history.
3. Lend flow from a book (or via scan): pick/create borrower, due date (default 14 days), notes. One open loan per Copy.
4. Return flow: "Returned" button and scan-to-return on /loans; shows the book's home shelf after return.
5. Loans page: on loan, overdue (highlighted), returned history; on-loan badges everywhere a Copy appears; shelf view shows lent books as gaps.
6. "Message borrower" button: opens a WhatsApp wa.me link or mailto with a pre-filled polite reminder (owner sends it themselves).
7. app/api/cron/reminders: daily job (Vercel Cron, protected by CRON_SECRET) that emails each workspace owner a digest of overdue loans via Resend (React Email template). Add vercel.json cron config.
8. Tests: tenancy for new models, one-open-loan rule, overdue calculation, cron auth, Playwright: lend → appears overdue (time-travel) → return.

Plan first. Update docs/PROGRESS.md at the end.
```

## Phase 5 — Billing

```
Read CLAUDE.md, docs/PROGRESS.md and the plans table in docs/SPEC.md.

Build Phase 5 (Billing) with Stripe:
1. lib/billing/plans.ts: plan definitions (limits + features) matching the seeded Plan rows; map Stripe price IDs from env.
2. /[workspace]/billing: current plan, usage vs limits (copies, members, cover scans this month), upgrade buttons → Stripe Checkout (subscription mode, workspace id in metadata), "Manage billing" → Customer Portal.
3. app/api/webhooks/stripe: verify signature; handle checkout.session.completed, customer.subscription.created/updated/deleted, invoice.payment_failed; idempotent upserts of Subscription; update Workspace.planId; downgrade to Free on cancellation.
4. Make assertWithinPlan read the live plan; feature flags (bulkScan, csv, borrowerReminders, coverScan) gate UI and server actions.
5. Members & roles: invite by email (Resend), accept invite, role changes, member limit enforced.
6. Tests: webhook handler with Stripe fixtures (idempotency, out-of-order events), limit checks, role guards. Document local testing with `stripe listen` in docs/PROGRESS.md.

Plan first. Update docs/PROGRESS.md at the end.
```

## Phase 6 — Launch

```
Read CLAUDE.md and docs/PROGRESS.md.

Build Phase 6 (Launch):
1. Marketing site in app/(marketing): landing page (hero, scan demo, features: scan / shelves / lending, pricing teaser, FAQ), /pricing driven by lib/billing/plans.ts, /terms and /privacy placeholders. SEO metadata, Open Graph image, sitemap, robots.
2. Production hardening: error boundaries and not-found pages, rate limiting on lookup and auth endpoints, security headers, Sentry (or similar) error tracking, structured logging.
3. Dockerfile (standalone output) + docker build check in CI, so the app can move to a VPS later.
4. GitHub Actions: lint, typecheck, test, build on every PR.
5. Deployment checklist in docs/DEPLOY.md: Vercel project (Pro plan before charging), domain librarycraft.aakasa.dev, Neon database + migrations, all env vars, Stripe live keys + webhook endpoint, Resend domain verification, Google OAuth production redirect URIs, Vercel Cron.

Plan first. Update docs/PROGRESS.md at the end.
```

---

## v1.1 prompts (after launch)

- **Cover recognition:** "Add cover-photo import: capture → upload to R2 → call the vision model at LLM_API_URL (llm.aakasa.dev) for {title, authors} JSON → search Open Library/Google Books by text → show top 3 matches → confirm. Meter each call as a UsageEvent and enforce the plan's monthly cover-scan limit."
- **Bulk scan + CSV:** "Add bulk scan mode (queue of ISBNs, review all, save to one shelf) and CSV import/export (Goodreads and LibraryThing formats), gated to Pro."
