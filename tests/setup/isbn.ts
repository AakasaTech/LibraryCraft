import { isbn13To10 } from "@/lib/isbn/isbn";

/** A random valid 978 ISBN-13, so tests never hit Editions cached by earlier runs. */
export function randomIsbn13(): string {
  const first12 = "978" + String(Math.floor(Math.random() * 1e9)).padStart(9, "0");
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (i % 2 === 0 ? 1 : 3);
  return first12 + ((10 - (sum % 10)) % 10);
}

export const isbn10Of = (isbn13: string) => isbn13To10(isbn13)!;
