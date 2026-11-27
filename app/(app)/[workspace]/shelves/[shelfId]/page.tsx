import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/guards";
import { BookList } from "@/components/books/book-list";

export default async function ShelfPage({ params }: PageProps<"/[workspace]/shelves/[shelfId]">) {
  const { workspace: slug, shelfId } = await params;
  const { db } = await requireMember(slug);
  const shelf = await db.shelf.findUnique({ where: { id: shelfId }, include: { bookcase: { include: { room: true } } } });
  if (!shelf) notFound();
  const copies = await db.copy.findMany({
    where: { shelfId: shelf.id },
    include: { edition: { select: { title: true, authors: true, coverUrl: true } }, shelf: { select: { name: true } } },
    orderBy: [{ edition: { title: "asc" } }, { id: "asc" }],
  });

  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="text-sm text-neutral-600">
          <Link href={`/${slug}/shelves`} className="underline">
            {shelf.bookcase.room.name} › {shelf.bookcase.name}
          </Link>
        </p>
        <h1 className="text-2xl font-semibold">{shelf.name}</h1>
        <p className="text-sm text-neutral-600">
          {copies.length} {copies.length === 1 ? "book" : "books"}
        </p>
      </div>
      {copies.length === 0 ? (
        <p className="text-neutral-600">This shelf is empty.</p>
      ) : (
        <BookList slug={slug} copies={copies} view="list" />
      )}
    </section>
  );
}
