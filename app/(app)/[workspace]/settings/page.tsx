import { signOut } from "@/lib/auth/config";

export default function SettingsPage() {
  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/sign-in" });
  }
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-neutral-600">Workspace settings and members arrive in Phase 5.</p>
      <form action={signOutAction}>
        <button className="h-11 rounded-lg border border-neutral-300 px-4 font-medium">Sign out</button>
      </form>
    </section>
  );
}
