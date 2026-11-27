import Link from "next/link";
import { requireMember } from "@/lib/auth/guards";
import { listUserWorkspaces } from "@/lib/db/workspaces";
import { BottomNav } from "@/components/app/bottom-nav";
import { WorkspaceSwitcher } from "@/components/app/workspace-switcher";

export default async function WorkspaceLayout({ children, params }: LayoutProps<"/[workspace]">) {
  const { workspace: slug } = await params;
  const { user, workspace } = await requireMember(slug);
  const workspaces = await listUserWorkspaces(user.id);

  return (
    <div className="flex flex-1 flex-col pb-16">
      <header className="flex items-center justify-between gap-3 border-b border-neutral-200 px-4 py-2">
        <Link href={`/${workspace.slug}`} className="flex h-11 items-center font-semibold">
          LibraryCraft
        </Link>
        <WorkspaceSwitcher current={workspace.slug} workspaces={workspaces} />
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 p-4">{children}</main>
      <BottomNav slug={workspace.slug} />
    </div>
  );
}
