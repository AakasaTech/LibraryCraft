import { expect, test } from "@playwright/test";
import { randomIsbn13 } from "../tests/setup/isbn";
import { createWorkspaceFor, prisma, signInAsNewUser } from "./helpers";

test.afterAll(() => prisma.$disconnect());

test("add a book by ISBN onto a new shelf and find it again", async ({ page, context }) => {
  const user = await signInAsNewUser(context);
  const { slug } = await createWorkspaceFor(user.id);

  // A cached Edition stands in for Open Library, so the test never calls a real catalogue.
  const isbn = randomIsbn13();
  const title = `The Test of ${isbn.slice(-6)}`;
  await prisma.edition.create({
    data: { isbn13: isbn, title, authors: ["Ada Lovelace"], authorsText: "ada lovelace", source: "OPENLIBRARY" },
  });

  // Room → Bookcase → Shelf
  await page.goto(`/${slug}/shelves`);
  await page.getByLabel("New room name").fill("Study");
  await page.getByRole("button", { name: "Add room" }).click();
  await page.getByLabel("New bookcase name").fill("Oak case");
  await page.getByRole("button", { name: "Add bookcase" }).click();
  await page.getByLabel("New shelf name").fill("Top");
  await page.getByRole("button", { name: "Add shelf" }).click();
  await expect(page.getByRole("link", { name: "Top" })).toBeVisible();

  // Look up → confirm → save
  await page.goto(`/${slug}/books/new`);
  await page.getByLabel("ISBN").fill(`${isbn.slice(0, 3)}-${isbn.slice(3)}`);
  await page.getByRole("button", { name: "Look up" }).click();
  const card = page.getByRole("form", { name: "Confirm book" });
  await expect(card.getByRole("heading", { name: title })).toBeVisible();
  await card.getByLabel("Shelf").selectOption({ label: "Study › Oak case › Top" });
  await card.getByRole("button", { name: "Save book" }).click();
  await expect(page.getByText("Book added.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Study › Oak case › Top" })).toBeVisible();

  // Search by author fragment and by ISBN
  await page.goto(`/${slug}/books?q=lovelace`);
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  await page.goto(`/${slug}/books?q=${isbn}&view=list`);
  await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();

  // It's on its shelf
  await page.getByRole("link", { name: "Shelves" }).click();
  await expect(page.getByRole("heading", { name: "Shelves" })).toBeVisible();
  await page.getByRole("link", { name: "Top", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Top" })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();

  // Adding it again warns about the duplicate
  await page.goto(`/${slug}/books/new`);
  await page.getByLabel("ISBN").fill(isbn);
  await page.getByRole("button", { name: "Look up" }).click();
  await expect(page.getByText("You already have a copy of this book.")).toBeVisible();
});

test("a shelf with books can't be deleted until its books are moved", async ({ page, context }) => {
  const user = await signInAsNewUser(context);
  const ws = await createWorkspaceFor(user.id);
  const room = await prisma.room.create({ data: { workspaceId: ws.id, name: "Hall" } });
  const bookcase = await prisma.bookcase.create({ data: { workspaceId: ws.id, roomId: room.id, name: "Case" } });
  const [full, empty] = await Promise.all(
    ["Full", "Empty"].map((name, position) =>
      prisma.shelf.create({ data: { workspaceId: ws.id, bookcaseId: bookcase.id, name, position } }),
    ),
  );
  const edition = await prisma.edition.create({ data: { title: "Movable", authors: [], source: "MANUAL" } });
  await prisma.copy.create({ data: { workspaceId: ws.id, editionId: edition.id, shelfId: full.id } });

  await page.goto(`/${ws.slug}/shelves`);
  const fullRow = page.locator("details", { has: page.locator("summary", { hasText: "Full" }) });
  await fullRow.locator("summary").click();
  // A shelf with books offers only "move books and delete", never a plain delete.
  await expect(fullRow.getByRole("button", { name: "Delete shelf", exact: true })).toHaveCount(0);
  await fullRow.getByRole("button", { name: "Move books and delete shelf" }).click();

  await expect(page.getByRole("link", { name: "Full", exact: true })).toHaveCount(0);
  expect(await prisma.copy.count({ where: { shelfId: empty.id } })).toBe(1);
});
