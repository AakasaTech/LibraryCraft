import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { prisma, signInAsNewUser } from "./helpers";

test.afterAll(() => prisma.$disconnect());

test("signed-out visitors are sent to sign-in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("button", { name: "Email me a sign-in link" })).toBeVisible();
});

test("requesting a magic link lands on the check-your-email page", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(`${randomUUID()}@e2e.local`);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
});

test("sign in → onboarding → dashboard with bottom nav", async ({ page, context }) => {
  await signInAsNewUser(context);

  await page.goto("/");
  await expect(page).toHaveURL(/\/onboarding$/);

  const name = `E2E Library ${randomUUID().slice(0, 6)}`;
  await page.getByLabel("Library name").fill(name);
  await page.getByRole("button", { name: "Create library" }).click();

  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page).toHaveURL(/\/e2e-library-[a-z0-9]+$/);

  const nav = page.getByRole("navigation", { name: "Main" });
  for (const label of ["Books", "Scan", "Loans", "Settings"]) {
    const link = nav.getByRole("link", { name: label });
    await expect(link).toBeVisible();
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  await nav.getByRole("link", { name: "Books" }).click();
  await expect(page.getByRole("heading", { name: "Books" })).toBeVisible();

  // Visiting the root again goes straight to the workspace.
  await page.goto("/");
  await expect(page.getByRole("heading", { name })).toBeVisible();
});

test("a user cannot open someone else's workspace", async ({ page, context }) => {
  const owner = await prisma.user.create({ data: { email: `${randomUUID()}@e2e.local` } });
  const slug = `private-${randomUUID().slice(0, 8)}`;
  await prisma.workspace.create({
    data: { name: "Private", slug, ownerId: owner.id, planId: "free", members: { create: { userId: owner.id, role: "OWNER" } } },
  });
  await signInAsNewUser(context);
  const res = await page.goto(`/${slug}`);
  expect(res?.status()).toBe(404);
});
