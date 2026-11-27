"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth/guards";
import { createWorkspace } from "@/lib/db/workspaces";

const schema = z.object({ name: z.string().trim().min(2, "Use at least 2 characters.").max(60, "Use 60 characters or fewer.") });

export type OnboardingState = { error?: string };

export async function createWorkspaceAction(_prev: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const user = await requireUser();
  const parsed = schema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  let slug: string;
  try {
    slug = (await createWorkspace(user.id, parsed.data.name)).slug;
  } catch (err) {
    console.error("createWorkspace failed", err);
    return { error: "We couldn't create your library. Please try again." };
  }
  redirect(`/${slug}`);
}
