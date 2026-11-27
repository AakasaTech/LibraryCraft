import { redirect } from "next/navigation";
import { z } from "zod";
import { auth, googleEnabled, signIn } from "@/lib/auth/config";

const emailSchema = z.object({ email: z.email() });

async function signInWithEmail(formData: FormData) {
  "use server";
  const parsed = emailSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) redirect("/sign-in?error=email");
  await signIn("resend", { email: parsed.data.email, redirectTo: "/" });
}

async function signInWithGoogle() {
  "use server";
  await signIn("google", { redirectTo: "/" });
}

export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  if ((await auth())?.user) redirect("/");
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Sign in to LibraryCraft</h1>
      {googleEnabled && (
        <form action={signInWithGoogle}>
          <button className="h-12 w-full rounded-lg border border-neutral-300 font-medium">Continue with Google</button>
        </form>
      )}
      <form action={signInWithEmail} className="flex flex-col gap-3">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-12 rounded-lg border border-neutral-300 px-3"
        />
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error === "email" ? "Enter a valid email address." : "Sign-in failed. Please try again."}
          </p>
        )}
        <button className="h-12 rounded-lg bg-neutral-900 font-medium text-white">Email me a sign-in link</button>
      </form>
    </main>
  );
}
