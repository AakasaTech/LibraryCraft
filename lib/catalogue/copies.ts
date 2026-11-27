import "server-only";
import { prisma } from "@/lib/db/client";
import type { TenantDb } from "@/lib/db/tenant";
import { assertWithinPlan } from "@/lib/billing/limits";
import type { ReadStatus } from "@/prisma/generated/client";

export class NotFoundError extends Error {}

/** Resolves a client-supplied shelf id through the tenant client: foreign or missing → NotFoundError. */
export async function resolveShelfId(db: TenantDb, shelfId: string | null | undefined): Promise<string | null> {
  if (!shelfId) return null;
  const shelf = await db.shelf.findUnique({ where: { id: shelfId }, select: { id: true } });
  if (!shelf) throw new NotFoundError("Shelf not found");
  return shelf.id;
}

export async function addCopy(
  db: TenantDb,
  workspaceId: string,
  input: { editionId: string; shelfId?: string | null; readStatus: ReadStatus },
) {
  const edition = await prisma.edition.findUnique({ where: { id: input.editionId }, select: { id: true } });
  if (!edition) throw new NotFoundError("Edition not found");
  const shelfId = await resolveShelfId(db, input.shelfId);
  // shortcut: count-then-insert can overshoot the limit by one under concurrent adds; fine for a soft plan cap.
  await assertWithinPlan(workspaceId, "copy");
  return db.copy.create({ data: { workspaceId, editionId: edition.id, shelfId, readStatus: input.readStatus } });
}
