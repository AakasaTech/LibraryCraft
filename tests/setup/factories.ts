import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/client";
import type { MemberRole } from "@/prisma/generated/client";

export function createUser() {
  return prisma.user.create({ data: { email: `${randomUUID()}@test.local`, name: "Test User" } });
}

export async function createWorkspaceWithOwner(role: MemberRole = "OWNER") {
  const user = await createUser();
  const workspace = await prisma.workspace.create({
    data: { name: "WS", slug: `ws-${randomUUID()}`, ownerId: user.id, planId: "free" },
  });
  const member = await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: user.id, role } });
  return { user, workspace, member };
}
