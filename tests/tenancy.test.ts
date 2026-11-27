import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db/client";
import { getTenantDb, scopeArgs } from "@/lib/db/tenant";
import { createUser, createWorkspaceWithOwner } from "./setup/factories";

describe("getTenantDb isolation", () => {
  it("workspace A cannot read or change workspace B's members or subscription", async () => {
    const a = await createWorkspaceWithOwner();
    const b = await createWorkspaceWithOwner();
    await prisma.subscription.create({
      data: { workspaceId: b.workspace.id, stripeCustomerId: `cus_${b.workspace.id}`, status: "ACTIVE" },
    });
    const dbA = getTenantDb(a.workspace.id);

    // Reads
    expect(await dbA.workspaceMember.findUnique({ where: { id: b.member.id } })).toBeNull();
    expect(await dbA.workspaceMember.findFirst({ where: { userId: b.user.id } })).toBeNull();
    expect((await dbA.workspaceMember.findMany()).map((m) => m.id)).toEqual([a.member.id]);
    expect(await dbA.workspaceMember.count()).toBe(1);
    expect(await dbA.subscription.findUnique({ where: { workspaceId: b.workspace.id } })).toBeNull();
    expect(await dbA.subscription.findMany()).toEqual([]);

    // Writes
    expect((await dbA.workspaceMember.updateMany({ data: { role: "VIEWER" } })).count).toBe(1);
    await expect(
      dbA.workspaceMember.update({ where: { id: b.member.id }, data: { role: "VIEWER" } }),
    ).rejects.toThrow();
    await expect(dbA.workspaceMember.delete({ where: { id: b.member.id } })).rejects.toThrow();
    expect((await dbA.subscription.deleteMany()).count).toBe(0);

    const stillB = await prisma.workspaceMember.findUniqueOrThrow({ where: { id: b.member.id } });
    expect(stillB.role).toBe("OWNER");
    expect(await prisma.subscription.count({ where: { workspaceId: b.workspace.id } })).toBe(1);
  });

  it("forces workspaceId on create, even if the caller passes another workspace", async () => {
    const a = await createWorkspaceWithOwner();
    const b = await createWorkspaceWithOwner();
    const newcomer = await createUser();
    const created = await getTenantDb(a.workspace.id).workspaceMember.create({
      data: { workspaceId: b.workspace.id, userId: newcomer.id, role: "EDITOR" },
    });
    expect(created.workspaceId).toBe(a.workspace.id);
  });

  it("refuses global models", async () => {
    const a = await createWorkspaceWithOwner();
    await expect(getTenantDb(a.workspace.id).user.findMany()).rejects.toThrow(/not a tenant model/);
    await expect(getTenantDb(a.workspace.id).workspace.findMany()).rejects.toThrow(/not a tenant model/);
  });

  it("scopeArgs covers createMany and upsert, and rejects unknown operations", () => {
    expect(scopeArgs("createMany", { data: [{ x: 1 }, { x: 2 }] }, "w")).toEqual({
      data: [
        { x: 1, workspaceId: "w" },
        { x: 2, workspaceId: "w" },
      ],
    });
    expect(scopeArgs("upsert", { where: { id: "1" }, create: { x: 1 }, update: { x: 2 } }, "w")).toEqual({
      where: { id: "1", workspaceId: "w" },
      create: { x: 1, workspaceId: "w" },
      update: { x: 2 },
    });
    expect(() => scopeArgs("$queryRaw", {}, "w")).toThrow();
  });
});
