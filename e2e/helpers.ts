import { randomUUID } from "node:crypto";
import type { BrowserContext } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../prisma/generated/client";

export const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL_TEST! }) });

// "Mock the provider": instead of driving Google or a real email, write the User + Session rows the
// Auth.js Prisma adapter would create, and hand the browser the session cookie.
export async function signInAsNewUser(context: BrowserContext) {
  const user = await prisma.user.create({ data: { email: `${randomUUID()}@e2e.local`, name: "E2E User" } });
  const sessionToken = randomUUID();
  await prisma.session.create({
    data: { sessionToken, userId: user.id, expires: new Date(Date.now() + 24 * 3600 * 1000) },
  });
  await context.addCookies([
    { name: "authjs.session-token", value: sessionToken, domain: "localhost", path: "/", httpOnly: true, sameSite: "Lax" },
  ]);
  return user;
}

export async function createWorkspaceFor(userId: string) {
  const slug = `e2e-${randomUUID().slice(0, 8)}`;
  return prisma.workspace.create({
    data: { name: "E2E Library", slug, ownerId: userId, planId: "free", members: { create: { userId, role: "OWNER" } } },
  });
}
