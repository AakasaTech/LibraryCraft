/** Strips hyphens, spaces and anything else that isn't a digit or X; upper-cases X. */
export function normalizeIsbn(input: string): string {
  return input.toUpperCase().replace(/[^0-9X]/g, "");
}

export function isValidIsbn10(isbn: string): boolean {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += (isbn[i] === "X" ? 10 : Number(isbn[i])) * (10 - i);
  return sum % 11 === 0;
}

function isbn13CheckDigit(first12: string): string {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return String((10 - (sum % 10)) % 10);
}

export function isValidIsbn13(isbn: string): boolean {
  return /^97[89]\d{10}$/.test(isbn) && isbn13CheckDigit(isbn.slice(0, 12)) === isbn[12];
}

/** Expects a valid ISBN-10. */
export function isbn10To13(isbn10: string): string {
  const first12 = "978" + isbn10.slice(0, 9);
  return first12 + isbn13CheckDigit(first12);
}

/** Only 978-prefixed ISBN-13s have an ISBN-10. Expects a valid ISBN-13. */
export function isbn13To10(isbn13: string): string | null {
  if (!isbn13.startsWith("978")) return null;
  const first9 = isbn13.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(first9[i]) * (10 - i);
  const check = (11 - (sum % 11)) % 11;
  return first9 + (check === 10 ? "X" : String(check));
}

/** Parses user or scanner input into both ISBN forms, or null if it isn't a valid ISBN. */
export function parseIsbn(input: string): { isbn13: string; isbn10: string | null } | null {
  const isbn = normalizeIsbn(input);
  if (isbn.length === 13 && isValidIsbn13(isbn)) return { isbn13: isbn, isbn10: isbn13To10(isbn) };
  if (isbn.length === 10 && isValidIsbn10(isbn)) return { isbn13: isbn10To13(isbn), isbn10: isbn };
  return null;
}
