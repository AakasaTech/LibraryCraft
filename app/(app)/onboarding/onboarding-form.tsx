"use client";
import { useActionState } from "react";
import { createWorkspaceAction, type OnboardingState } from "./actions";

export function OnboardingForm() {
  const [state, action, pending] = useActionState<OnboardingState, FormData>(createWorkspaceAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="name" className="text-sm font-medium">
        Library name
      </label>
      <input
        id="name"
        name="name"
        required
        placeholder="Our family library"
        className="h-12 rounded-lg border border-neutral-300 px-3"
      />
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="h-12 rounded-lg bg-neutral-900 font-medium text-white disabled:opacity-60">
        {pending ? "Creating…" : "Create library"}
      </button>
    </form>
  );
}
