import Link from "next/link";
import { requireMember } from "@/lib/auth/guards";

export default async function DashboardPage({ params }: PageProps<"/[workspace]">) {
  const { workspace, db } = await requireMember((await params).workspace);
  const [books, shelves] = await Promise.all([db.copy.count(), db.shelf.count()]);
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{workspace.name}</h1>
      <p className="text-neutral-600">
        {books} {books === 1 ? "book" : "books"} on {shelves} {shelves === 1 ? "shelf" : "shelves"}
      </p>
      <div className="flex gap-2">
        <Link href={`/${workspace.slug}/books/new`} className="flex h-12 items-center rounded-lg bg-neutral-900 px-4 font-medium text-white">
          Add a book
        </Link>
        <Link href={`/${workspace.slug}/shelves`} className="flex h-12 items-center rounded-lg border border-neutral-300 px-4 font-medium">
          Set up shelves
        </Link>
      </div>
    </section>
  );
}
