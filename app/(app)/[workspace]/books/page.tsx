import Link from "next/link";
import { requireMember } from "@/lib/auth/guards";
import { listShelfOptions } from "@/lib/catalogue/shelves";
import { parseIsbn } from "@/lib/isbn/isbn";
import { READ_STATUSES } from "@/components/books/book-fields";
import { BookList } from "@/components/books/book-list";
import type { Prisma, ReadStatus } from "@/prisma/generated/client";

const PAGE_SIZE = 24;
const str = (v: string | string[] | undefined) => (typeof v === "string" ? v.trim() : "");

export default async function BooksPage({ params, searchParams }: PageProps<"/[workspace]/books">) {
  const { workspace: slug } = await params;
  const sp = await searchParams;
  const { db, member } = await requireMember(slug);

  const q = str(sp.q).slice(0, 100);
  const shelf = str(sp.shelf);
  const status = READ_STATUSES.some((s) => s.value === str(sp.status)) ? (str(sp.status) as ReadStatus) : "";
  const view = str(sp.view) === "list" ? "list" : "grid";
  const page = Math.max(1, Number.parseInt(str(sp.page), 10) || 1);

  const isbn = q ? parseIsbn(q) : null;
  const where: Prisma.CopyWhereInput = {
    ...(shelf === "none" ? { shelfId: null } : shelf ? { shelfId: shelf } : {}),
    ...(status ? { readStatus: status } : {}),
    ...(q
      ? {
          edition: {
            OR: [
              { title: { contains: q, mode: "insensitive" } },
              { authorsText: { contains: q.toLowerCase() } },
              ...(isbn ? [{ isbn13: isbn.isbn13 }] : []),
            ],
          },
        }
      : {}),
  };

  const [total, copies, shelves] = await Promise.all([
    db.copy.count({ where }),
    db.copy.findMany({
      where,
      include: { edition: { select: { title: true, authors: true, coverUrl: true } }, shelf: { select: { name: true } } },
      orderBy: [{ addedAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    listShelfOptions(db),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (overrides: Record<string, string>) => {
    const next = new URLSearchParams({ ...(q && { q }), ...(shelf && { shelf }), ...(status && { status }), view, ...overrides });
    return `/${slug}/books?${next}`;
  };
  const field = "h-11 rounded-lg border border-neutral-300 bg-white px-2";

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Books</h1>
        <div className="flex gap-2">
          <Link href={`/${slug}/shelves`} className="flex h-11 items-center rounded-lg border border-neutral-300 px-3 text-sm font-medium">
            Shelves
          </Link>
          {member.role !== "VIEWER" && (
            <Link href={`/${slug}/books/new`} className="flex h-11 items-center rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white">
              Add book
            </Link>
          )}
        </div>
      </div>

      <form role="search" className="flex flex-col gap-2">
        <input type="hidden" name="view" value={view} />
        <input
          type="search"
          name="q"
          defaultValue={q}
          aria-label="Search books"
          placeholder="Title, author or ISBN"
          className={`${field} px-3`}
        />
        <div className="grid grid-cols-2 gap-2">
          <select name="shelf" defaultValue={shelf} aria-label="Shelf" className={field}>
            <option value="">All shelves</option>
            <option value="none">Not on a shelf</option>
            {shelves.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={status} aria-label="Reading status" className={field}>
            <option value="">Any status</option>
            {READ_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <button className="h-11 rounded-lg border border-neutral-300 font-medium">Search</button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <span className="text-neutral-600">
          {total} {total === 1 ? "book" : "books"}
        </span>
        <span className="flex gap-1">
          {(["grid", "list"] as const).map((v) => (
            <Link
              key={v}
              href={href({ view: v })}
              aria-current={view === v ? "true" : undefined}
              className={`flex h-11 items-center rounded-lg px-3 capitalize ${view === v ? "bg-neutral-900 text-white" : "border border-neutral-300"}`}
            >
              {v}
            </Link>
          ))}
        </span>
      </div>

      {copies.length === 0 ? (
        <p className="text-neutral-600">{q || shelf || status ? "No books match." : "No books yet. Add your first one."}</p>
      ) : (
        <BookList slug={slug} copies={copies} view={view} />
      )}

      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between">
          {page > 1 ? (
            <Link href={href({ page: String(page - 1) })} className="flex h-11 items-center px-3 font-medium underline">
              Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-neutral-600">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Link href={href({ page: String(page + 1) })} className="flex h-11 items-center px-3 font-medium underline">
              Next
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}
