"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMember } from "@/lib/auth/guards";
import {
  countCopiesUnder,
  deleteLocation,
  siblingIds,
  updateLocation,
  type LocationKind,
} from "@/lib/catalogue/shelves";

const name = z.string().trim().min(1, "Enter a name.").max(60, "Use 60 characters or fewer.");
const kind = z.enum(["room", "bookcase", "shelf"]);
const id = z.string().min(1);
const base = z.object({ workspace: z.string().min(1) });

const createSchema = base.extend({ kind, parentId: z.string().optional(), name });
const renameSchema = base.extend({ kind, id, name });
const moveSchema = base.extend({ kind, id, direction: z.enum(["up", "down"]) });
const deleteSchema = base.extend({ kind, id });
const moveBooksSchema = base.extend({ id, targetShelfId: id });

export type ShelvesError = "invalid" | "not-found" | "has-books" | "same-shelf";

function fail(workspace: string, error: ShelvesError): never {
  redirect(`/${workspace}/shelves?error=${error}`);
}

function parse<T extends z.ZodType>(schema: T, formData: FormData): z.infer<T> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) fail(String(formData.get("workspace") ?? ""), "invalid");
  return parsed.data;
}

const done = (workspace: string) => revalidatePath(`/${workspace}/shelves`);

export async function createLocation(formData: FormData) {
  const input = parse(createSchema, formData);
  const { db, workspace } = await requireMember(input.workspace, "EDITOR");

  if (input.kind === "room") {
    const position = await db.room.count();
    await db.room.create({ data: { workspaceId: workspace.id, name: input.name, position } });
  } else if (input.kind === "bookcase") {
    // Parent ids come from the client: resolve them through the tenant client so a foreign id is "not found".
    const room = input.parentId ? await db.room.findUnique({ where: { id: input.parentId } }) : null;
    if (!room) fail(input.workspace, "not-found");
    const position = await db.bookcase.count({ where: { roomId: room.id } });
    await db.bookcase.create({ data: { workspaceId: workspace.id, roomId: room.id, name: input.name, position } });
  } else {
    const bookcase = input.parentId ? await db.bookcase.findUnique({ where: { id: input.parentId } }) : null;
    if (!bookcase) fail(input.workspace, "not-found");
    const position = await db.shelf.count({ where: { bookcaseId: bookcase.id } });
    await db.shelf.create({ data: { workspaceId: workspace.id, bookcaseId: bookcase.id, name: input.name, position } });
  }
  done(input.workspace);
}

export async function renameLocation(formData: FormData) {
  const input = parse(renameSchema, formData);
  const { db } = await requireMember(input.workspace, "EDITOR");
  try {
    await updateLocation(db, input.kind, input.id, { name: input.name });
  } catch {
    fail(input.workspace, "not-found");
  }
  done(input.workspace);
}

export async function moveLocation(formData: FormData) {
  const input = parse(moveSchema, formData);
  const { db } = await requireMember(input.workspace, "EDITOR");
  const ids = await siblingIds(db, input.kind, input.id);
  if (!ids) fail(input.workspace, "not-found");
  const from = ids.indexOf(input.id);
  const to = input.direction === "up" ? from - 1 : from + 1;
  if (to >= 0 && to < ids.length) {
    [ids[from], ids[to]] = [ids[to], ids[from]];
    // Rewrite every sibling's position so ties from older rows can't make the swap a no-op.
    await Promise.all(ids.map((sid, position) => updateLocation(db, input.kind as LocationKind, sid, { position })));
  }
  done(input.workspace);
}

export async function deleteLocationAction(formData: FormData) {
  const input = parse(deleteSchema, formData);
  const { db } = await requireMember(input.workspace, "EDITOR");
  if ((await countCopiesUnder(db, input.kind, input.id)) > 0) fail(input.workspace, "has-books");
  try {
    await deleteLocation(db, input.kind, input.id);
  } catch {
    fail(input.workspace, "not-found");
  }
  done(input.workspace);
}

export async function moveBooksAndDeleteShelf(formData: FormData) {
  const input = parse(moveBooksSchema, formData);
  if (input.id === input.targetShelfId) fail(input.workspace, "same-shelf");
  const { db } = await requireMember(input.workspace, "EDITOR");
  const [shelf, target] = await Promise.all([
    db.shelf.findUnique({ where: { id: input.id } }),
    db.shelf.findUnique({ where: { id: input.targetShelfId } }),
  ]);
  if (!shelf || !target) fail(input.workspace, "not-found");
  await db.copy.updateMany({ where: { shelfId: shelf.id }, data: { shelfId: target.id } });
  await db.shelf.delete({ where: { id: shelf.id } });
  done(input.workspace);
}
