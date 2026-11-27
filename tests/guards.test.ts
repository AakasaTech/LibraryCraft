import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUser, createWorkspaceWithOwner } from "./setup/factories";

const session = vi.hoisted(() => ({ current: null as null | { user: { id: string } } }));
vi.mock("@/lib/auth/config", () => ({ auth: async () => session.current }));

const { requireMember, requireUser, ForbiddenError } = await import("@/lib/auth/guards");

// next/navigation's redirect() and notFound() throw errors tagged with a digest.
const digestOf = (p: Promise<unknown>) =>
  p.then(
    () => "resolved",
    (e: { digest?: string }) => e.digest ?? String(e),
  );

describe("guards", () => {
  beforeEach(() => {
    session.current = null;
  });

  it("requireUser redirects to /sign-in without a session", async () => {
    expect(await digestOf(requireUser())).toMatch(/^NEXT_REDIRECT;.*\/sign-in/);
  });

  it("requireMember 404s for a non-member", async () => {
    const { workspace } = await createWorkspaceWithOwner();
    const outsider = await createUser();
    session.current = { user: { id: outsider.id } };
    expect(await digestOf(requireMember(workspace.slug))).toMatch(/404/);
  });

  it("requireMember enforces the minimum role", async () => {
    const { user, workspace } = await createWorkspaceWithOwner("VIEWER");
    session.current = { user: { id: user.id } };
    await expect(requireMember(workspace.slug, "EDITOR")).rejects.toBeInstanceOf(ForbiddenError);
    const ok = await requireMember(workspace.slug, "VIEWER");
    expect(ok.member.role).toBe("VIEWER");
  });

  it("requireMember returns a tenant db scoped to the workspace", async () => {
    const { user, workspace } = await createWorkspaceWithOwner("OWNER");
    await createWorkspaceWithOwner(); // noise in another workspace
    session.current = { user: { id: user.id } };
    const { db, workspace: resolved } = await requireMember(workspace.slug, "OWNER");
    expect(resolved.id).toBe(workspace.id);
    expect(await db.workspaceMember.count()).toBe(1);
  });
});
