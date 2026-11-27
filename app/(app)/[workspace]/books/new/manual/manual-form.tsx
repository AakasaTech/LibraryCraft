"use client";
import Link from "next/link";
import { useActionState } from "react";
import { ReadStatusSelect, ShelfSelect } from "@/components/books/book-fields";
import { createManualAction, type FormState } from "../../actions";

type Props = { workspace: string; shelves: { id: string; label: string }[]; isbn: string };

const input = "h-11 rounded-lg border border-neutral-300 px-3";

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <input {...props} className={input} />
    </label>
  );
}

export function ManualForm({ workspace, shelves, isbn }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(createManualAction, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="workspace" value={workspace} />
      <Field label="Title" name="title" required maxLength={300} />
      <Field label="Authors (comma separated)" name="authors" maxLength={500} />
      <Field label="Publisher" name="publisher" maxLength={200} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Year" name="year" inputMode="numeric" pattern="[0-9]*" maxLength={4} />
        <Field label="Pages" name="pages" inputMode="numeric" pattern="[0-9]*" maxLength={5} />
      </div>
      <Field label="ISBN (optional)" name="isbn" defaultValue={isbn} inputMode="numeric" maxLength={40} />
      <ShelfSelect shelves={shelves} />
      <ReadStatusSelect />
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
          {state.upgrade && (
            <>
              {" "}
              <Link href={`/${workspace}/settings`} className="font-medium underline">
                See plans
              </Link>
            </>
          )}
        </p>
      )}
      <button disabled={pending} className="h-12 rounded-lg bg-neutral-900 font-medium text-white disabled:opacity-60">
        {pending ? "Saving…" : "Save book"}
      </button>
    </form>
  );
}
