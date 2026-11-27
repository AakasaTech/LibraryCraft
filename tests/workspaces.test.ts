import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { assertWithinPlan, PlanLimitError } from "@/lib/billing/limits";
import { createWorkspace, slugify } from "@/lib/db/workspaces";
import { createUser, createWorkspaceWithOwner } from "./setup/factories";

describe("slugify", () => {
  it.each([
    ["The Home Library", "the-home-library"],
    ["  Café  Books!! ", "cafe-books"],
    ["!!!", "library"],
    ["පොත්", "library"], // Sinhala only → fallback
  ])("%s -> %s", (input, slug) => expect(slugify(input)).toBe(slug));

  it("caps length without a trailing dash", () => {
    const slug = slugify("a".repeat(47) + " bcd");
    expect(slug.length).toBeLessThanOrEqual(48);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("createWorkspace", () => {
  it("creates a Free workspace with the user as OWNER and de-duplicates slugs", async () => {
    const user = await createUser();
    const name = `Home ${randomUUID().slice(0, 8)}`;
    const first = await createWorkspace(user.id, name);
    const second = await createWorkspace(user.id, name);
    expect(first.planId).toBe("free");
    expect(second.slug).toBe(`${first.slug}-2`);
    const member = await prisma.workspaceMember.findFirstOrThrow({ where: { workspaceId: first.id } });
    expect(member).toMatchObject({ userId: user.id, role: "OWNER" });
  });
});

describe("assertWithinPlan('member')", () => {
  it("allows up to the Free plan's 2 members, then throws", async () => {
    const { workspace } = await createWorkspaceWithOwner();
    await expect(assertWithinPlan(workspace.id, "member")).resolves.toBeUndefined();
    const second = await createUser();
    await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: second.id } });
    await expect(assertWithinPlan(workspace.id, "member")).rejects.toBeInstanceOf(PlanLimitError);
  });

  it("treats a null limit as unlimited", async () => {
    const { workspace } = await createWorkspaceWithOwner();
    await prisma.workspace.update({ where: { id: workspace.id }, data: { planId: "organisation" } });
    for (let i = 0; i < 3; i++) {
      const u = await createUser();
      await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId: u.id } });
    }
    await expect(assertWithinPlan(workspace.id, "member")).resolves.toBeUndefined();
  });
});

describe("assertWithinPlan('copy')", () => {
  it("blocks the 301st copy on Free and allows it on Pro", async () => {
    const { workspace } = await createWorkspaceWithOwner();
    const edition = await prisma.edition.create({ data: { title: "Filler", authors: [], source: "MANUAL" } });
    await prisma.copy.createMany({
      data: Array.from({ length: 299 }, () => ({ workspaceId: workspace.id, editionId: edition.id })),
    });
    await expect(assertWithinPlan(workspace.id, "copy")).resolves.toBeUndefined();
    await prisma.copy.create({ data: { workspaceId: workspace.id, editionId: edition.id } });
    const err = await assertWithinPlan(workspace.id, "copy").catch((e) => e);
    expect(err).toBeInstanceOf(PlanLimitError);
    expect(err.message).toBe("You've reached 300 books on the Free plan. Upgrade to add more.");
    await prisma.workspace.update({ where: { id: workspace.id }, data: { planId: "pro" } });
    await expect(assertWithinPlan(workspace.id, "copy")).resolves.toBeUndefined();
  });
});
