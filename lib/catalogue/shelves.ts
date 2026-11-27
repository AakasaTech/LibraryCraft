import "server-only";
import type { TenantDb } from "@/lib/db/tenant";

export type LocationKind = "room" | "bookcase" | "shelf";

/** Every shelf as "Room › Bookcase › Shelf", in tree order, for shelf pickers. */
export async function listShelfOptions(db: TenantDb) {
  const shelves = await db.shelf.findMany({
    include: { bookcase: { include: { room: true } } },
  });
  return shelves
    .sort(
      (a, b) =>
        a.bookcase.room.position - b.bookcase.room.position ||
        a.bookcase.position - b.bookcase.position ||
        a.position - b.position ||
        a.name.localeCompare(b.name),
    )
    .map((s) => ({ id: s.id, label: `${s.bookcase.room.name} › ${s.bookcase.name} › ${s.name}` }));
}

/** Copies on the location or anything inside it. */
export function countCopiesUnder(db: TenantDb, kind: LocationKind, id: string) {
  const where =
    kind === "room"
      ? { shelf: { bookcase: { roomId: id } } }
      : kind === "bookcase"
        ? { shelf: { bookcaseId: id } }
        : { shelfId: id };
  return db.copy.count({ where });
}

/** Sibling ids in display order, or null if the location isn't in this workspace. */
export async function siblingIds(db: TenantDb, kind: LocationKind, id: string): Promise<string[] | null> {
  const order = [{ position: "asc" as const }, { name: "asc" as const }];
  if (kind === "room") {
    if (!(await db.room.findUnique({ where: { id } }))) return null;
    return (await db.room.findMany({ orderBy: order, select: { id: true } })).map((r) => r.id);
  }
  if (kind === "bookcase") {
    const item = await db.bookcase.findUnique({ where: { id } });
    if (!item) return null;
    const rows = await db.bookcase.findMany({ where: { roomId: item.roomId }, orderBy: order, select: { id: true } });
    return rows.map((r) => r.id);
  }
  const item = await db.shelf.findUnique({ where: { id } });
  if (!item) return null;
  const rows = await db.shelf.findMany({ where: { bookcaseId: item.bookcaseId }, orderBy: order, select: { id: true } });
  return rows.map((r) => r.id);
}

export function updateLocation(db: TenantDb, kind: LocationKind, id: string, data: { name?: string; position?: number }) {
  const args = { where: { id }, data };
  return kind === "room" ? db.room.update(args) : kind === "bookcase" ? db.bookcase.update(args) : db.shelf.update(args);
}

export function deleteLocation(db: TenantDb, kind: LocationKind, id: string) {
  const args = { where: { id } };
  return kind === "room" ? db.room.delete(args) : kind === "bookcase" ? db.bookcase.delete(args) : db.shelf.delete(args);
}
