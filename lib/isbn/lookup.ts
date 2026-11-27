import "server-only";
import { prisma } from "@/lib/db/client";
import { env } from "@/lib/env";
import { saveEdition, type EditionData } from "@/lib/catalogue/editions";
import { parseIsbn } from "@/lib/isbn/isbn";

const TIMEOUT_MS = 5000;
type Fetch = typeof fetch;
type Isbns = { isbn13: string; isbn10: string | null };

async function getJson(fetchFn: Fetch, url: string): Promise<unknown> {
  try {
    const res = await fetchFn(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { Accept: "application/json" } });
    if (!res.ok) {
      console.warn(`[isbn] ${new URL(url).host} responded ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn(`[isbn] ${new URL(url).host} failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}

const yearFrom = (date: unknown) => {
  const m = typeof date === "string" ? date.match(/\d{4}/) : null;
  return m ? Number(m[0]) : null;
};
const https = (url: unknown) => (typeof url === "string" ? url.replace(/^http:/, "https:") : null);

type OpenLibraryBook = {
  title?: string;
  subtitle?: string;
  authors?: { name?: string }[];
  publishers?: { name?: string }[];
  publish_date?: string;
  number_of_pages?: number;
  cover?: { medium?: string };
};

export async function fromOpenLibrary(isbns: Isbns, fetchFn: Fetch): Promise<EditionData | null> {
  const key = `ISBN:${isbns.isbn13}`;
  const json = (await getJson(
    fetchFn,
    `https://openlibrary.org/api/books?bibkeys=${key}&format=json&jscmd=data`,
  )) as Record<string, OpenLibraryBook> | null;
  const book = json?.[key];
  if (!book?.title) return null;
  return {
    ...isbns,
    title: book.title,
    subtitle: book.subtitle ?? null,
    authors: (book.authors ?? []).map((a) => a.name).filter((n): n is string => !!n),
    publisher: book.publishers?.[0]?.name ?? null,
    year: yearFrom(book.publish_date),
    pages: typeof book.number_of_pages === "number" ? book.number_of_pages : null,
    coverUrl: https(book.cover?.medium),
    source: "OPENLIBRARY",
  };
}

type GoogleVolume = {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  language?: string;
  pageCount?: number;
  imageLinks?: { thumbnail?: string };
};

export async function fromGoogleBooks(isbns: Isbns, fetchFn: Fetch): Promise<EditionData | null> {
  // Google's keyless quota is 0, so without a key the call can only fail.
  if (!env.GOOGLE_BOOKS_API_KEY) return null;
  const json = (await getJson(
    fetchFn,
    `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbns.isbn13}&key=${env.GOOGLE_BOOKS_API_KEY}`,
  )) as { items?: { volumeInfo?: GoogleVolume }[] } | null;
  const v = json?.items?.[0]?.volumeInfo;
  if (!v?.title) return null;
  return {
    ...isbns,
    title: v.title,
    subtitle: v.subtitle ?? null,
    authors: v.authors ?? [],
    publisher: v.publisher ?? null,
    year: yearFrom(v.publishedDate),
    language: v.language ?? null,
    pages: typeof v.pageCount === "number" ? v.pageCount : null,
    coverUrl: https(v.imageLinks?.thumbnail),
    source: "GOOGLE",
  };
}

/** Cached Edition → Open Library → Google Books → save. Null for an invalid ISBN or when nothing matches. */
export async function lookupIsbn(input: string, fetchFn: Fetch = fetch) {
  const isbns = parseIsbn(input);
  if (!isbns) return null;
  const cached = await prisma.edition.findUnique({ where: { isbn13: isbns.isbn13 } });
  if (cached) return cached;
  const found = (await fromOpenLibrary(isbns, fetchFn)) ?? (await fromGoogleBooks(isbns, fetchFn));
  return found ? saveEdition(found) : null;
}
