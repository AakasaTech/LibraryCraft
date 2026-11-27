import "server-only";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { getTenantDb } from "@/lib/db/tenant";
import type { MemberRole } from "@/prisma/generated/client";

const RANK: Record<MemberRole, number> = { VIEWER: 0, EDITOR: 1, ADMIN: 2, OWNER: 3 };

export class ForbiddenError extends Error {
  constructor() {
    super("You don't have permission to do that.");
    this.name = "ForbiddenError";
  }
}

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");
  return { id: session.user.id, name: session.user.name ?? null, email: session.user.email ?? "" };
}

/** Resolves session → workspace (by slug) → membership. Not a member: 404, so slugs don't leak. */
export async function requireMember(workspaceSlug: string, minRole: MemberRole = "VIEWER") {
  const user = await requireUser();
  const member = await prisma.workspaceMember.findFirst({
    where: { userId: user.id, workspace: { slug: workspaceSlug } },
    include: { workspace: true },
  });
  if (!member) notFound();
  if (RANK[member.role] < RANK[minRole]) throw new ForbiddenError();
  const { workspace, ...membership } = member;
  return { user, workspace, member: membership, db: getTenantDb(workspace.id) };
}
