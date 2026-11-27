"use client";
import Link from "next/link";
import { useActionState } from "react";
import { BookCover } from "@/components/books/book-cover";
import { ReadStatusSelect, ShelfSelect } from "@/components/books/book-fields";
import { lookupAction, saveCopyAction, type FormState, type LookupState } from "../actions";

type Props = { workspace: string; shelves: { id: string; label: string }[] };

const primary = "h-12 rounded-lg bg-neutral-900 px-4 font-medium text-white disabled:opacity-60";

export function AddBookForm({ workspace, shelves }: Props) {
  const [lookup, lookupFormAction, looking] = useActionState<LookupState, FormData>(lookupAction, { status: "idle" });
  const [save, saveFormAction, saving] = useActionState<FormState, FormData>(saveCopyAction, {});

  return (
    <div className="flex flex-col gap-6">
      <form action={lookupFormAction} className="flex flex-col gap-2">
        <input type="hidden" name="workspace" value={workspace} />
        <label htmlFor="isbn" className="text-sm font-medium">
          ISBN
        </label>
        <div className="flex gap-2">
          <input
            id="isbn"
            name="isbn"
            required
            inputMode="numeric"
            autoComplete="off"
            defaultValue={lookup.status === "idle" ? "" : lookup.isbn}
            placeholder="978…"
            className="h-12 min-w-0 flex-1 rounded-lg border border-neutral-300 px-3"
          />
          <button disabled={looking} className={primary}>
            {looking ? "Looking up…" : "Look up"}
          </button>
        </div>
        {lookup.status === "invalid" && (
          <p role="alert" className="text-sm text-red-600">
            That isn&apos;t a valid ISBN. Check the 10 or 13 digits and try again.
          </p>
        )}
        {lookup.status === "not-found" && (
          <p role="alert" className="text-sm text-neutral-700">
            We couldn&apos;t find that ISBN in Open Library or Google Books.{" "}
            <Link
              href={`/${workspace}/books/new/manual?isbn=${encodeURIComponent(lookup.isbn)}`}
              className="font-medium underline"
            >
              Add it by hand
            </Link>
          </p>
        )}
      </form>

      {lookup.status === "found" && (
        <form
          key={lookup.edition.id}
          action={saveFormAction}
          aria-label="Confirm book"
          className="flex flex-col gap-4 rounded-xl border border-neutral-200 p-4"
        >
          <input type="hidden" name="workspace" value={workspace} />
          <input type="hidden" name="editionId" value={lookup.edition.id} />
          <div className="flex gap-4">
            <BookCover title={lookup.edition.title} coverUrl={lookup.edition.coverUrl} />
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">{lookup.edition.title}</h2>
              {lookup.edition.subtitle && <p className="text-sm text-neutral-600">{lookup.edition.subtitle}</p>}
              <p className="text-sm">{lookup.edition.authors.join(", ") || "Unknown author"}</p>
              <p className="text-sm text-neutral-600">
                {[lookup.edition.publisher, lookup.edition.year].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          {lookup.duplicates > 0 && (
            <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
              You already have {lookup.duplicates === 1 ? "a copy" : `${lookup.duplicates} copies`} of this book. You can
              still add another.
            </p>
          )}
          <ShelfSelect shelves={shelves} />
          <ReadStatusSelect />
          {save.error && (
            <p role="alert" className="text-sm text-red-600">
              {save.error}
              {save.upgrade && (
                <>
                  {" "}
                  <Link href={`/${workspace}/settings`} className="font-medium underline">
                    See plans
                  </Link>
                </>
              )}
            </p>
          )}
          <button disabled={saving} className={primary}>
            {saving ? "Saving…" : "Save book"}
          </button>
        </form>
      )}
    </div>
  );
}
