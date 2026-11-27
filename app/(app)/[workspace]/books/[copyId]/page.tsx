import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/guards";
import { listShelfOptions } from "@/lib/catalogue/shelves";
import { BookCover } from "@/components/books/book-cover";
import { READ_STATUSES, ReadStatusSelect, ShelfSelect } from "@/components/books/book-fields";
import { deleteCopyAction, updateCopyAction } from "../actions";

export default async function BookPage({ params, searchParams }: PageProps<"/[workspace]/books/[copyId]">) {
  const { workspace: slug, copyId } = await params;
  const { added, saved, error } = await searchParams;
  const { db, member } = await requireMember(slug);
  const copy = await db.copy.findUnique({
    where: { id: copyId },
    include: { edition: true, shelf: { include: { bookcase: { include: { room: true } } } } },
  });
  if (!copy) notFound();
  const canEdit = member.role !== "VIEWER";
  const shelves = canEdit ? await listShelfOptions(db) : [];
  const { edition } = copy;
  const location = copy.shelf
    ? `${copy.shelf.bookcase.room.name} › ${copy.shelf.bookcase.name} › ${copy.shelf.name}`
    : "Not on a shelf";

  return (
    <section className="flex flex-col gap-4">
      {added && <Banner>Book added.</Banner>}
      {saved && <Banner>Changes saved.</Banner>}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          We couldn&apos;t save your changes. The shelf may have been removed; refresh and try again.
        </p>
      )}
      <div className="flex gap-4">
        <BookCover title={edition.title} coverUrl={edition.coverUrl} className="w-28" />
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">{edition.title}</h1>
          {edition.subtitle && <p className="text-sm text-neutral-600">{edition.subtitle}</p>}
          <p className="text-sm">{edition.authors.join(", ") || "Unknown author"}</p>
          <p className="text-sm text-neutral-600">
            {[edition.publisher, edition.year, edition.pages && `${edition.pages} pages`].filter(Boolean).join(" · ")}
          </p>
          {edition.isbn13 && <p className="text-xs text-neutral-500">ISBN {edition.isbn13}</p>}
        </div>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-neutral-500">Shelf</dt>
        <dd>
          {copy.shelf ? (
            <Link href={`/${slug}/shelves/${copy.shelf.id}`} className="underline">
              {location}
            </Link>
          ) : (
            location
          )}
        </dd>
        <dt className="text-neutral-500">Status</dt>
        <dd>{READ_STATUSES.find((s) => s.value === copy.readStatus)?.label}</dd>
      </dl>

      {canEdit && (
        <>
          <form action={updateCopyAction} aria-label="Edit book" className="flex flex-col gap-3 rounded-xl border border-neutral-200 p-4">
            <h2 className="font-semibold">Edit</h2>
            <input type="hidden" name="workspace" value={slug} />
            <input type="hidden" name="copyId" value={copy.id} />
            <ShelfSelect shelves={shelves} defaultValue={copy.shelfId} />
            <ReadStatusSelect defaultValue={copy.readStatus} />
            <label className="flex flex-col gap-1 text-sm font-medium">
              Condition
              <input name="condition" defaultValue={copy.condition ?? ""} maxLength={100} className="h-11 rounded-lg border border-neutral-300 px-3" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Notes
              <textarea name="notes" defaultValue={copy.notes ?? ""} maxLength={2000} rows={3} className="rounded-lg border border-neutral-300 p-3" />
            </label>
            <button className="h-12 rounded-lg bg-neutral-900 font-medium text-white">Save changes</button>
          </form>

          <details className="rounded-xl border border-red-200 p-4">
            <summary className="flex min-h-11 cursor-pointer items-center font-medium text-red-700">Delete this book</summary>
            <form action={deleteCopyAction} className="mt-2 flex flex-col gap-2">
              <input type="hidden" name="workspace" value={slug} />
              <input type="hidden" name="copyId" value={copy.id} />
              <p className="text-sm text-neutral-600">This removes the book from your library. It can&apos;t be undone.</p>
              <button className="h-11 rounded-lg bg-red-700 font-medium text-white">Yes, delete it</button>
            </form>
          </details>
        </>
      )}
    </section>
  );
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <p role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
      {children}
    </p>
  );
}
