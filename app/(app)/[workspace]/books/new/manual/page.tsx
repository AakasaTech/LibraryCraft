import { requireMember } from "@/lib/auth/guards";
import { listShelfOptions } from "@/lib/catalogue/shelves";
import { ManualForm } from "./manual-form";

export default async function ManualBookPage({ params, searchParams }: PageProps<"/[workspace]/books/new/manual">) {
  const { workspace: slug } = await params;
  const { isbn } = await searchParams;
  const { db } = await requireMember(slug, "EDITOR");
  const shelves = await listShelfOptions(db);
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Add a book by hand</h1>
      <ManualForm workspace={slug} shelves={shelves} isbn={typeof isbn === "string" ? isbn : ""} />
    </section>
  );
}
