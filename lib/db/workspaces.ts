import "server-only";
import { prisma } from "@/lib/db/client";
import { assertWithinPlan } from "@/lib/billing/limits";

export function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return slug || "library";
}

/** Creates a workspace on the Free plan with the user as OWNER. The slug gets -2, -3... if taken. */
export async function createWorkspace(userId: string, name: string) {
  const base = slugify(name);
  const taken = new Set(
    (await prisma.workspace.findMany({ where: { slug: { startsWith: base } }, select: { slug: true } })).map(
      (w) => w.slug,
    ),
  );
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;

  // Workspace creation is the tenant root, so it uses the raw client here in lib/ rather than getTenantDb.
  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({ data: { name, slug, ownerId: userId, planId: "free" } });
    await assertWithinPlan(workspace.id, "member", tx);
    await tx.workspaceMember.create({ data: { workspaceId: workspace.id, userId, role: "OWNER" } });
    return workspace;
  });
}

/** Workspaces the user belongs to, for the switcher and the root redirect. */
export function listUserWorkspaces(userId: string) {
  return prisma.workspace.findMany({
    where: { members: { some: { userId } } },
    select: { id: true, name: true, slug: true },
    orderBy: { createdAt: "asc" },
  });
}
