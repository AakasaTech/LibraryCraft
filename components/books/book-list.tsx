import Link from "next/link";
import { BookCover } from "./book-cover";

export type BookListItem = {
  id: string;
  edition: { title: string; authors: string[]; coverUrl: string | null };
  shelf: { name: string } | null;
};

export function BookList({ slug, copies, view }: { slug: string; copies: BookListItem[]; view: "grid" | "list" }) {
  if (view === "grid") {
    return (
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {copies.map((c) => (
          <li key={c.id}>
            <Link href={`/${slug}/books/${c.id}`} className="flex flex-col gap-1">
              <BookCover title={c.edition.title} coverUrl={c.edition.coverUrl} className="w-full" />
              <span className="line-clamp-2 text-xs font-medium">{c.edition.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="divide-y divide-neutral-200">
      {copies.map((c) => (
        <li key={c.id}>
          <Link href={`/${slug}/books/${c.id}`} className="flex min-h-14 items-center gap-3 py-2">
            <BookCover title="" coverUrl={c.edition.coverUrl} className="w-10" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{c.edition.title}</span>
              <span className="truncate text-sm text-neutral-600">
                {[c.edition.authors.join(", "), c.shelf?.name].filter(Boolean).join(" · ")}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
