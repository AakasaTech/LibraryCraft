import { describe, expect, it } from "vitest";
import { isbn10To13, isbn13To10, isValidIsbn10, isValidIsbn13, normalizeIsbn, parseIsbn } from "@/lib/isbn/isbn";

describe("normalizeIsbn", () => {
  it("strips hyphens, spaces and prefixes, upper-cases x", () => {
    expect(normalizeIsbn(" 978-0-261-10357-3 ")).toBe("9780261103573");
    expect(normalizeIsbn("ISBN 0-8044-2957-x")).toBe("080442957X");
  });
});

describe("validation", () => {
  it.each(["0261103571", "080442957X", "0306406152"])("valid ISBN-10 %s", (i) => expect(isValidIsbn10(i)).toBe(true));
  it.each(["0261103572", "08044295X7", "123456789", "abcdefghij"])("invalid ISBN-10 %s", (i) =>
    expect(isValidIsbn10(i)).toBe(false),
  );
  it.each(["9780261103573", "9780306406157", "9791034304561"])("valid ISBN-13 %s", (i) =>
    expect(isValidIsbn13(i)).toBe(true),
  );
  it.each(["9780261103574", "1234567890128", "978026110357"])("invalid ISBN-13 %s", (i) =>
    expect(isValidIsbn13(i)).toBe(false),
  );
});

describe("conversion", () => {
  it("converts 10 → 13 and back", () => {
    expect(isbn10To13("0261103571")).toBe("9780261103573");
    expect(isbn13To10("9780261103573")).toBe("0261103571");
    expect(isbn10To13("080442957X")).toBe("9780804429573");
    expect(isbn13To10("9780804429573")).toBe("080442957X");
  });
  it("has no ISBN-10 for 979 prefixes", () => expect(isbn13To10("9791034304561")).toBeNull());
});

describe("parseIsbn", () => {
  it("returns both forms from either input", () => {
    expect(parseIsbn("0-261-10357-1")).toEqual({ isbn13: "9780261103573", isbn10: "0261103571" });
    expect(parseIsbn("978 0 261 10357 3")).toEqual({ isbn13: "9780261103573", isbn10: "0261103571" });
    expect(parseIsbn("9791034304561")).toEqual({ isbn13: "9791034304561", isbn10: null });
  });
  it.each(["", "hello", "9780261103574", "12345"])("rejects %j", (i) => expect(parseIsbn(i)).toBeNull());
});
