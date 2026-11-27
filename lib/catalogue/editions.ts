import "server-only";
import { prisma } from "@/lib/db/client";
import type { EditionSource } from "@/prisma/generated/client";

export type EditionData = {
  isbn13: string | null;
  isbn10: string | null;
  title: string;
  subtitle?: string | null;
  authors: string[];
  publisher?: string | null;
  year?: number | null;
  language?: string | null;
  pages?: number | null;
  coverUrl?: string | null;
  source: EditionSource;
};

export const authorsText = (authors: string[]) => authors.join(" ").toLowerCase();

/** Saves an Edition (global table). With an ISBN it upserts, so concurrent lookups don't collide. */
export function saveEdition(data: EditionData) {
  const row = { ...data, authorsText: authorsText(data.authors) };
  if (!data.isbn13) return prisma.edition.create({ data: row });
  // The first writer wins; later saves of the same ISBN return the cached row unchanged.
  return prisma.edition.upsert({ where: { isbn13: data.isbn13 }, create: row, update: {} });
}
