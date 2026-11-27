import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/guards";
import { listUserWorkspaces } from "@/lib/db/workspaces";

// Phase 6 replaces this with the marketing landing page for signed-out visitors.
export default async function Home() {
  const user = await requireUser();
  const [first] = await listUserWorkspaces(user.id);
  redirect(first ? `/${first.slug}` : "/onboarding");
}
