# LibraryCraft — Product Spec

Source of truth: the LibraryCraft spec doc (claude.ai). This copy lives in the repo so Claude Code can read it. Last synced: 2026-11-26.

## Overview

LibraryCraft is a multi-tenant SaaS for cataloguing a home library from a PC or a phone. You add books by scanning the ISBN barcode or photographing the cover, put them on shelves that match your real bookcases, and track who has borrowed what.

- **Who it's for:** households with a few hundred to a few thousand books and readers who lend often; on paid plans, also small school, church and community libraries.
- **Business model:** a SaaS built like BillCraft AI. A generous free plan brings in users, and paid plans unlock larger collections, family sharing and features for organisations.
- **Domain:** librarycraft.aakasa.dev hosts both the landing page and the app.
- **Build:** developed with Claude Code in phases (see `docs/PROMPTS.md`).

## Goals and non-goals

Version 1 succeeds if adding a book takes under 10 seconds and you can always answer "where is it?" and "who has it?"

**Goals for v1**

- Add a book in one scan, with title, author, cover and publisher filled in automatically.
- Fall back to a cover photo when there's no barcode (older books, local Sinhala and Tamil editions).
- Mirror your real bookcases as rooms, bookcases and shelves.
- Record loans with a borrower, a due date and a reminder.
- Work the same on a phone and a PC, installable as a PWA, with no app store needed.
- Run as a SaaS from day one: sign-up, a workspace per library, plan limits, and Stripe subscriptions.

**Not in v1**

- Native iOS and Android apps.
- Social features: public profiles, reviews, following.
- Ebook or audiobook storage.
- Multi-library lending between strangers.
- In-app purchases through the app stores.

## Core features

### 1. Book import

| Method | How it works | When it's used |
| --- | --- | --- |
| ISBN barcode scan | Phone or webcam reads the EAN-13 barcode, then the app looks up metadata by ISBN | Most books printed after about 1970 |
| ISBN typed in | Same lookup, from a typed ISBN-10 or ISBN-13 | A damaged barcode, or no camera |
| Cover photo (v1.1) | A vision model reads the title and author off the cover, then the app searches catalogues by text and shows the top matches | Older books, local editions, books with no barcode |
| Manual entry | A form with optional cover upload | Anything the lookups can't find |
| Bulk scan mode (v1.1) | Scan many barcodes in a row, then review them all at once | First-time setup of a large collection |
| CSV import (v1.1) | Upload an export from Goodreads, LibraryThing or a spreadsheet | People moving from another tool |

After a lookup the user always sees a confirmation card where they can fix fields, pick a cover, and choose a shelf before saving. Duplicates are flagged, but a second copy can still be added.

### 2. Shelf management

- A three-level location tree: **Room → Bookcase → Shelf**, for example Living room → Tall white case → Shelf 3.
- Books can be moved one at a time or in bulk, including scanning books straight onto a chosen shelf.
- Tags and collections such as "Kids", "Signed" or "To read" sit alongside physical location.
- Reading status per book: unread, reading, read.
- Each shelf has a view showing its books in order, useful for tidying up.

### 3. Lending management

- Borrowers are saved as contacts with a name and an optional phone or email. They don't need an account.
- Lending a book records the borrower, the date lent and an optional due date (default 14 days).
- Books out on loan are clearly marked everywhere they appear, and the shelf view shows them as gaps.
- An overdue list plus reminders: an email to the owner, and an optional WhatsApp or email message the owner can send to the borrower.
- Full loan history for each book and each borrower.
- A quick return: scan the book's ISBN and it's marked returned.

### 4. Search and browse

- Instant search by title, author, ISBN, tag or borrower.
- Filters for shelf, status, on loan, language and genre.
- Grid view with covers, or list view.
- Basic stats: total books, books on loan, and books added each month.

## User flows

Each main flow takes three taps or fewer from the home screen.

**Add a book (barcode)**
1. Tap **Scan** and point the camera at the barcode.
2. The ISBN lookup fills in title, author, cover, publisher and year.
3. Pick a shelf; the last shelf used is pre-selected.
4. Tap **Save**. The scanner stays open for the next book.

**Add a book (cover photo, v1.1)**
1. Tap **Scan**, then **Cover**, and take a photo.
2. The vision model pulls out the title and author, and the app searches the catalogues.
3. Choose from the top three matches, or tap **None of these** to open a pre-filled manual form.
4. Pick a shelf and save. The photo becomes the cover if no catalogue image exists.

**Re-shelve books**
1. Open the destination shelf and tap **Scan onto this shelf**.
2. Scan each book. Each one moves and the shelf list updates live.

**Lend a book**
1. Open the book, or scan it, and tap **Lend**.
2. Pick an existing borrower or add a new one.
3. Set a due date: 2 weeks by default, editable.
4. Optionally send the borrower a WhatsApp or email note.

**Return a book**
1. Tap **Return** and scan the book, or tap **Returned** on the loan.
2. The loan is closed and the app shows the book's home shelf.

## Data model

Shared book metadata (**Edition**) is kept separate from a workspace's own **Copy**, so each ISBN is looked up only once across all users. See `prisma/schema.prisma` for the draft schema.

| Entity | Key fields | Notes |
| --- | --- | --- |
| User | id, name, email, auth provider | Sign-in with Google or an email magic link |
| Workspace | id, name, slug, type (home, school, community), planId, ownerId | The tenant: one library, the unit of billing |
| WorkspaceMember | workspaceId, userId, role (owner, admin, editor, viewer) | Family or staff access |
| Plan | id, name, maxCopies, maxMembers, features[] | Free, Pro, Family, Organisation |
| Subscription | id, workspaceId, stripeCustomerId, stripeSubscriptionId, status, currentPeriodEnd | Kept in sync by Stripe webhooks |
| Edition | id, isbn10, isbn13, title, subtitle, authors[], publisher, year, language, pages, coverUrl, source | Shared across tenants; source is openlibrary, google or manual |
| Copy | id, workspaceId, editionId, shelfId, condition, readStatus, notes, addedAt | One row per physical book; counts toward the plan limit |
| Room | id, workspaceId, name | For example: Living room |
| Bookcase | id, roomId, name | For example: Tall white case |
| Shelf | id, bookcaseId, name, position | For example: Shelf 3, ordered top to bottom |
| Tag / CopyTag | id, workspaceId, name / copyId, tagId | Collections such as Kids or Signed |
| Borrower | id, workspaceId, name, phone, email, memberCode | A contact; memberCode is for organisation libraries |
| Loan | id, copyId, borrowerId, lentAt, dueAt, returnedAt, notes | An open loan has no returnedAt |
| UsageEvent | id, workspaceId, kind (cover_scan, import), createdAt | Meters AI cover scans for plan limits |

Every tenant-owned row carries a workspaceId. Edition is the only shared table.

## Architecture and tech stack

A single Next.js app served as a PWA, so one codebase covers the phone and the PC. Barcodes are decoded on the device, so the server only ever sees an ISBN. Catalogue results are cached as Editions.

| Layer | Choice |
| --- | --- |
| Frontend | Next.js (App Router), TypeScript, Tailwind, installable PWA |
| Barcode scanning | Browser BarcodeDetector API, with ZXing as the fallback |
| Database | PostgreSQL with Prisma (Neon in production, Docker Postgres locally) |
| Auth | Auth.js with Google and an email magic link (via Resend) |
| Multi-tenancy | A workspace per library, every query scoped by workspaceId |
| Billing | Stripe Checkout, Customer Portal and webhooks (PayPal later) |
| ISBN metadata | Open Library first, Google Books as the fallback |
| Cover recognition (v1.1) | Vision model via llm.aakasa.dev, returning title and author as JSON |
| Cover storage | Cloudflare R2 or S3 |
| Email | Resend |
| Hosting | Vercel (Pro once commercial) at librarycraft.aakasa.dev; Vercel Cron for daily reminders; Dockerfile kept ready for a later move to the shared Aakasa VPS or EKS |

## Roadmap

**MVP (launch)**
- Sign-up, workspaces, rooms, bookcases and shelves
- ISBN barcode scan, typed ISBN, manual entry
- Borrowers, loans, an overdue list, email reminders to the owner
- Search, grid and list views, PWA install
- Free and Pro plans with Stripe Checkout, the Customer Portal and plan limits
- Landing and pricing pages on librarycraft.aakasa.dev

**v1.1**
- Cover photo recognition
- Bulk scan mode and CSV import and export
- Shared family libraries (members and roles)
- Push notifications and WhatsApp or email nudges to borrowers

**Later**
- Spine scanning: one photo of a shelf identifies many books
- A public "lending shelf" link where friends can request a book
- Wishlist and duplicate check while in a bookshop
- Native apps, if the PWA's camera support falls short

**Proposed plans (prices to be set)**

| Plan | For | Limits and features |
| --- | --- | --- |
| Free | Small home libraries | Up to 300 books, 2 members, barcode scanning, lending, 10 cover scans a month |
| Pro | Serious collectors | Unlimited books, 100 cover scans a month, bulk scanning, CSV import and export, reminders to borrowers |
| Family | Households sharing one collection | Everything in Pro, plus up to 6 members |
| Organisation | Schools, churches, community libraries | Everything in Pro, plus unlimited staff, member codes, check-out cards and reports |

## Open questions

- [ ] Offline-first or online-only for the MVP?
- [ ] A dependable metadata source for Sri Lankan and Sinhala- or Tamil-language books?
- [ ] Borrower reminders automatic, or only sent by the owner?
- [ ] Which vision model for cover recognition?
- [ ] Cover images hot-linked or copied to our own storage?
- [ ] Prices for Pro, Family and Organisation; bill in USD, LKR or both?
