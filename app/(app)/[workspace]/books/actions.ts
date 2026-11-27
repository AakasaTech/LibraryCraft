"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMember } from "@/lib/auth/guards";
import { PlanLimitError } from "@/lib/billing/limits";
import { saveEdition } from "@/lib/catalogue/editions";
import { addCopy, NotFoundError, resolveShelfId } from "@/lib/catalogue/copies";
import { parseIsbn } from "@/lib/isbn/isbn";
import { lookupIsbn } from "@/lib/isbn/lookup";

const workspace = z.string().min(1);
const readStatus = z.enum(["UNREAD", "READING", "READ"]).default("UNREAD");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null)
    .nullish();
const optionalInt = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : v), z.coerce.number().int().min(min).max(max).nullable());

export type FormState = { error?: string; upgrade?: boolean };

function friendly(err: unknown): string {
  if (err instanceof PlanLimitError) return err.message;
  if (err instanceof NotFoundError) return "That shelf or book no longer exists. Refresh and try again.";
  console.error("[books] action failed", err);
  return "Something went wrong saving the book. Please try again.";
}

// ---------- Lookup → confirm → save ----------

export type LookupState =
  | { status: "idle" }
  | { status: "invalid"; isbn: string }
  | { status: "not-found"; isbn: string }
  | {
      status: "found";
      isbn: string;
      duplicates: number;
      edition: {
        id: string;
        title: string;
        subtitle: string | null;
        authors: string[];
        publisher: string | null;
        year: number | null;
        coverUrl: string | null;
      };
    };

const lookupSchema = z.object({ workspace, isbn: z.string().max(40) });

export async function lookupAction(_prev: LookupState, formData: FormData): Promise<LookupState> {
  const input = lookupSchema.parse(Object.fromEntries(formData));
  const { db } = await requireMember(input.workspace, "EDITOR");
  if (!parseIsbn(input.isbn)) return { status: "invalid", isbn: input.isbn };
  const edition = await lookupIsbn(input.isbn);
  if (!edition) return { status: "not-found", isbn: input.isbn };
  const duplicates = await db.copy.count({ where: { editionId: edition.id } });
  const { id, title, subtitle, authors, publisher, year, coverUrl } = edition;
  return {
    status: "found",
    isbn: input.isbn,
    duplicates,
    edition: { id, title, subtitle, authors, publisher, year, coverUrl },
  };
}

const saveSchema = z.object({ workspace, editionId: z.string().min(1), shelfId: z.string().optional(), readStatus });

export async function saveCopyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const input = saveSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) return { error: "Please check the form and try again." };
  const { db, workspace: ws } = await requireMember(input.data.workspace, "EDITOR");
  let copyId: string;
  try {
    copyId = (await addCopy(db, ws.id, input.data)).id;
  } catch (err) {
    return { error: friendly(err), upgrade: err instanceof PlanLimitError };
  }
  revalidatePath(`/${ws.slug}/books`);
  redirect(`/${ws.slug}/books/${copyId}?added=1`);
}

// ---------- Manual entry ----------

const manualSchema = z.object({
  workspace,
  title: z.string().trim().min(1, "Enter a title.").max(300),
  authors: z.string().max(500).default(""),
  publisher: optionalText(200),
  year: optionalInt(0, 2100),
  pages: optionalInt(1, 20000),
  isbn: z.string().max(40).default(""),
  shelfId: z.string().optional(),
  readStatus,
});

export async function createManualAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = manualSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const input = parsed.data;
  const { db, workspace: ws } = await requireMember(input.workspace, "EDITOR");

  const isbns = input.isbn.trim() ? parseIsbn(input.isbn) : null;
  if (input.isbn.trim() && !isbns) return { error: "That ISBN isn't valid. Leave it blank if the book has none." };

  let copyId: string;
  try {
    // Editions are shared by every library: if the ISBN is in a catalogue, use that record rather than
    // letting manual input claim the ISBN. Only unknown ISBNs get a MANUAL edition.
    const edition =
      (isbns && (await lookupIsbn(isbns.isbn13))) ||
      (await saveEdition({
        isbn13: isbns?.isbn13 ?? null,
        isbn10: isbns?.isbn10 ?? null,
        title: input.title,
        authors: input.authors
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        publisher: input.publisher,
        year: input.year,
        pages: input.pages,
        source: "MANUAL",
      }));
    copyId = (await addCopy(db, ws.id, { editionId: edition.id, shelfId: input.shelfId, readStatus: input.readStatus })).id;
  } catch (err) {
    return { error: friendly(err), upgrade: err instanceof PlanLimitError };
  }
  revalidatePath(`/${ws.slug}/books`);
  redirect(`/${ws.slug}/books/${copyId}?added=1`);
}

// ---------- Edit / move / delete ----------

const updateSchema = z.object({
  workspace,
  copyId: z.string().min(1),
  shelfId: z.string().optional(),
  readStatus,
  condition: optionalText(100),
  notes: optionalText(2000),
});

export async function updateCopyAction(formData: FormData) {
  const input = updateSchema.parse(Object.fromEntries(formData));
  const { db, workspace: ws } = await requireMember(input.workspace, "EDITOR");
  let ok = true;
  try {
    const shelfId = await resolveShelfId(db, input.shelfId);
    await db.copy.update({
      where: { id: input.copyId },
      data: { shelfId, readStatus: input.readStatus, condition: input.condition, notes: input.notes },
    });
  } catch (err) {
    friendly(err); // logs unexpected errors
    ok = false;
  }
  revalidatePath(`/${ws.slug}/books`);
  redirect(`/${ws.slug}/books/${input.copyId}?${ok ? "saved=1" : "error=1"}`);
}

const deleteSchema = z.object({ workspace, copyId: z.string().min(1) });

export async function deleteCopyAction(formData: FormData) {
  const input = deleteSchema.parse(Object.fromEntries(formData));
  const { db, workspace: ws } = await requireMember(input.workspace, "EDITOR");
  await db.copy.deleteMany({ where: { id: input.copyId } });
  revalidatePath(`/${ws.slug}/books`);
  redirect(`/${ws.slug}/books`);
}
