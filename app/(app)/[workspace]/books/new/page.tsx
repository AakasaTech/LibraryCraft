import Link from "next/link";
import { requireMember } from "@/lib/auth/guards";
import { listShelfOptions } from "@/lib/catalogue/shelves";
import { AddBookForm } from "./add-book-form";

export default async function NewBookPage({ params }: PageProps<"/[workspace]/books/new">) {
  const { workspace: slug } = await params;
  const { db } = await requireMember(slug, "EDITOR");
  const shelves = await listShelfOptions(db);
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Add a book</h1>
      <AddBookForm workspace={slug} shelves={shelves} />
      <Link href={`/${slug}/books/new/manual`} className="flex h-11 items-center text-sm font-medium underline">
        No ISBN? Enter the book by hand
      </Link>
    </section>
  );
}
