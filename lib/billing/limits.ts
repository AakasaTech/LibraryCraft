import "server-only";
import { prisma } from "@/lib/db/client";
import type { Prisma } from "@/prisma/generated/client";

// 'coverScan' arrives in Phase 5.
export type LimitKind = "member" | "copy";

const NOUN: Record<LimitKind, string> = { member: "members", copy: "books" };

export class PlanLimitError extends Error {
  constructor(
    public kind: LimitKind,
    public limit: number,
    public planName: string,
  ) {
    super(`You've reached ${limit} ${NOUN[kind]} on the ${planName} plan. Upgrade to add more.`);
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
    select: {
      plan: { select: { name: true, maxMembers: true, maxCopies: true } },
      _count: { select: { members: true, copies: true } },
    },
  });
  const [limit, used] =
    kind === "member"
      ? [workspace.plan.maxMembers, workspace._count.members]
      : [workspace.plan.maxCopies, workspace._count.copies];
  if (limit !== null && used >= limit) throw new PlanLimitError(kind, limit, workspace.plan.name);
}
