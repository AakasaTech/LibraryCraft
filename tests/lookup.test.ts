import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/client";
import { randomIsbn13 } from "./setup/isbn";

const mockEnv = vi.hoisted(() => ({ GOOGLE_BOOKS_API_KEY: undefined as string | undefined }));
vi.mock("@/lib/env", async (importOriginal) => {
  const real = (await importOriginal<typeof import("@/lib/env")>()).env;
  return { env: new Proxy(real, { get: (t, k) => (k in mockEnv ? mockEnv[k as keyof typeof mockEnv] : t[k as keyof typeof t]) }) };
});

const { lookupIsbn } = await import("@/lib/isbn/lookup");

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

function fakeFetch(routes: { openlibrary?: () => Response | Promise<Response>; google?: () => Response | Promise<Response> }) {
  return vi.fn(async (url: string | URL | Request) => {
    const host = new URL(String(url)).host;
    const handler = host === "openlibrary.org" ? routes.openlibrary : routes.google;
    if (!handler) throw new Error(`unexpected fetch to ${host}`);
    return handler();
  }) as unknown as typeof fetch & ReturnType<typeof vi.fn>;
}

const olBook = (isbn13: string) => ({
  [`ISBN:${isbn13}`]: {
    title: "The Fellowship of the Ring",
    subtitle: "The Lord of the Rings, Part I",
    authors: [{ name: "J.R.R. Tolkien" }],
    publishers: [{ name: "HarperCollins" }],
    publish_date: "June 2011",
    number_of_pages: 407,
    cover: { medium: "http://covers.openlibrary.org/b/id/1-M.jpg" },
  },
});

afterEach(() => {
  mockEnv.GOOGLE_BOOKS_API_KEY = undefined;
  vi.restoreAllMocks();
});

describe("lookupIsbn", () => {
  it("returns null for an invalid ISBN without calling out", async () => {
    const f = fakeFetch({});
    expect(await lookupIsbn("12345", f)).toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it("maps an Open Library hit and caches it as an Edition", async () => {
    const isbn = randomIsbn13();
    const f = fakeFetch({ openlibrary: () => json(olBook(isbn)) });
    const edition = await lookupIsbn(isbn, f);
    expect(edition).toMatchObject({
      isbn13: isbn,
      title: "The Fellowship of the Ring",
      authors: ["J.R.R. Tolkien"],
      authorsText: "j.r.r. tolkien",
      publisher: "HarperCollins",
      year: 2011,
      pages: 407,
      coverUrl: "https://covers.openlibrary.org/b/id/1-M.jpg",
      source: "OPENLIBRARY",
    });
    // Second lookup (via ISBN-10 input) is served from the DB.
    const again = await lookupIsbn(edition!.isbn10!, f);
    expect(again!.id).toBe(edition!.id);
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("falls back to Google Books when Open Library misses and a key is set", async () => {
    mockEnv.GOOGLE_BOOKS_API_KEY = "test-key";
    const isbn = randomIsbn13();
    const f = fakeFetch({
      openlibrary: () => json({}),
      google: () =>
        json({
          items: [
            {
              volumeInfo: {
                title: "Gamperaliya",
                authors: ["Martin Wickramasinghe"],
                publishedDate: "1944",
                language: "si",
                imageLinks: { thumbnail: "http://books.google.com/x.jpg" },
              },
            },
          ],
        }),
    });
    expect(await lookupIsbn(isbn, f)).toMatchObject({
      title: "Gamperaliya",
      language: "si",
      year: 1944,
      coverUrl: "https://books.google.com/x.jpg",
      source: "GOOGLE",
    });
  });

  it("skips Google Books without an API key", async () => {
    const f = fakeFetch({ openlibrary: () => json({}) });
    expect(await lookupIsbn(randomIsbn13(), f)).toBeNull();
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("treats errors, 429s, bad JSON and timeouts as a miss", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mockEnv.GOOGLE_BOOKS_API_KEY = "test-key";
    const timeout = () => Promise.reject(new DOMException("The operation timed out.", "TimeoutError"));
    const cases = [
      fakeFetch({ openlibrary: () => json({}, 500), google: () => json({ error: {} }, 429) }),
      fakeFetch({ openlibrary: () => new Response("<html>"), google: timeout }),
      fakeFetch({ openlibrary: () => Promise.reject(new TypeError("fetch failed")), google: () => json({}) }),
    ];
    for (const f of cases) expect(await lookupIsbn(randomIsbn13(), f)).toBeNull();
  });

  it("concurrent lookups of the same ISBN create one Edition", async () => {
    const isbn = randomIsbn13();
    const f = fakeFetch({ openlibrary: () => json(olBook(isbn)) });
    const [a, b] = await Promise.all([lookupIsbn(isbn, f), lookupIsbn(isbn, f)]);
    expect(a!.id).toBe(b!.id);
    expect(await prisma.edition.count({ where: { isbn13: isbn } })).toBe(1);
  });
});
