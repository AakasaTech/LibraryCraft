import { requireMember } from "@/lib/auth/guards";

export default async function DashboardPage({ params }: PageProps<"/[workspace]">) {
  const { workspace } = await requireMember((await params).workspace);
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">{workspace.name}</h1>
      <p className="text-neutral-600">Your library is empty. Scanning and adding books arrives in the next phases.</p>
    </section>
  );
}
