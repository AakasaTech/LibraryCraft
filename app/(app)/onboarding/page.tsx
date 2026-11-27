import { requireUser } from "@/lib/auth/guards";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  await requireUser();
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Name your library</h1>
        <p className="text-neutral-600">You can create more libraries later. Each starts on the Free plan.</p>
      </div>
      <OnboardingForm />
    </main>
  );
}
