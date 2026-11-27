import "server-only";
import { prisma } from "@/lib/db/client";
import type { Prisma } from "@/prisma/generated/client";

// 'copy' arrives in Phase 2, 'coverScan' in Phase 5.
export type LimitKind = "member";

export class PlanLimitError extends Error {
  constructor(public kind: LimitKind, public limit: number) {
    super(`Your plan allows ${limit} ${kind}s. Upgrade to add more.`);
    this.name = "PlanLimitError";
  }
}

// Pass `db` when calling inside a transaction so uncommitted rows are counted.
export async function assertWithinPlan(
  workspaceId: string,
  kind: LimitKind,
  db: Prisma.TransactionClient = prisma,
): Promise<void> {
  const workspace = await db.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    select: { plan: { select: { maxMembers: true } }, _count: { select: { members: true } } },
  });
  const limit = workspace.plan.maxMembers;
  if (limit !== null && workspace._count.members >= limit) throw new PlanLimitError(kind, limit);
}
