import Link from "next/link";
import { requireMember } from "@/lib/auth/guards";
import { listShelfOptions, type LocationKind } from "@/lib/catalogue/shelves";
import {
  createLocation,
  deleteLocationAction,
  moveBooksAndDeleteShelf,
  moveLocation,
  renameLocation,
  type ShelvesError,
} from "./actions";

const ERRORS: Record<ShelvesError, string> = {
  invalid: "Please check the name and try again.",
  "not-found": "That location no longer exists.",
  "has-books": "Move the books off its shelves before deleting it.",
  "same-shelf": "Pick a different shelf to move the books to.",
};

const order = { orderBy: [{ position: "asc" as const }, { name: "asc" as const }] };
const btn = "h-11 min-w-11 rounded-lg border border-neutral-300 px-3 text-sm font-medium";
const input = "h-11 min-w-0 flex-1 rounded-lg border border-neutral-300 px-3";

export default async function ShelvesPage({ params, searchParams }: PageProps<"/[workspace]/shelves">) {
  const { workspace: slug } = await params;
  const { error } = await searchParams;
  const { db } = await requireMember(slug);
  const [rooms, shelfOptions] = await Promise.all([
    db.room.findMany({
      ...order,
      include: { bookcases: { ...order, include: { shelves: { ...order, include: { _count: { select: { copies: true } } } } } } },
    }),
    listShelfOptions(db),
  ]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Shelves</h1>
        <Link href={`/${slug}/books`} className="flex h-11 items-center text-sm font-medium underline">
          Books
        </Link>
      </div>
      {typeof error === "string" && error in ERRORS && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {ERRORS[error as ShelvesError]}
        </p>
      )}
      {rooms.length === 0 && <p className="text-neutral-600">Start with a room, such as “Living room”.</p>}

      <ul className="flex flex-col gap-3">
        {rooms.map((room, ri) => (
          <li key={room.id} className="rounded-xl border border-neutral-200 p-3">
            <Row slug={slug} kind="room" id={room.id} name={room.name} first={ri === 0} last={ri === rooms.length - 1} />
            <ul className="mt-2 flex flex-col gap-2 border-l border-neutral-200 pl-3">
              {room.bookcases.map((bookcase, bi) => (
                <li key={bookcase.id}>
                  <Row
                    slug={slug}
                    kind="bookcase"
                    id={bookcase.id}
                    name={bookcase.name}
                    first={bi === 0}
                    last={bi === room.bookcases.length - 1}
                  />
                  <ul className="mt-2 flex flex-col gap-2 border-l border-neutral-200 pl-3">
                    {bookcase.shelves.map((shelf, si) => (
                      <li key={shelf.id}>
                        <Row
                          slug={slug}
                          kind="shelf"
                          id={shelf.id}
                          name={shelf.name}
                          first={si === 0}
                          last={si === bookcase.shelves.length - 1}
                          copies={shelf._count.copies}
                          moveTargets={shelfOptions.filter((o) => o.id !== shelf.id)}
                        />
                      </li>
                    ))}
                    <li>
                      <AddForm slug={slug} kind="shelf" parentId={bookcase.id} label="Add shelf" />
                    </li>
                  </ul>
                </li>
              ))}
              <li>
                <AddForm slug={slug} kind="bookcase" parentId={room.id} label="Add bookcase" />
              </li>
            </ul>
          </li>
        ))}
      </ul>
      <AddForm slug={slug} kind="room" label="Add room" />
    </section>
  );
}

function AddForm({ slug, kind, parentId, label }: { slug: string; kind: LocationKind; parentId?: string; label: string }) {
  return (
    <form action={createLocation} className="flex gap-2">
      <input type="hidden" name="workspace" value={slug} />
      <input type="hidden" name="kind" value={kind} />
      {parentId && <input type="hidden" name="parentId" value={parentId} />}
      <input name="name" required maxLength={60} aria-label={`New ${kind} name`} placeholder={`New ${kind}`} className={input} />
      <button className={btn}>{label}</button>
    </form>
  );
}

type RowProps = {
  slug: string;
  kind: LocationKind;
  id: string;
  name: string;
  first: boolean;
  last: boolean;
  copies?: number;
  moveTargets?: { id: string; label: string }[];
};

function Row({ slug, kind, id, name, first, last, copies, moveTargets }: RowProps) {
  const hidden = (
    <>
      <input type="hidden" name="workspace" value={slug} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
    </>
  );
  return (
    <details className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2">
        <span className={kind === "room" ? "font-semibold" : kind === "bookcase" ? "font-medium" : ""}>
          {kind === "shelf" ? (
            <Link href={`/${slug}/shelves/${id}`} className="underline-offset-2 hover:underline">
              {name}
            </Link>
          ) : (
            name
          )}
          {copies !== undefined && <span className="ml-2 text-sm text-neutral-500">{copies} books</span>}
        </span>
        <span className="text-sm text-neutral-500 group-open:hidden">Edit</span>
      </summary>
      <div className="mt-2 flex flex-col gap-2 rounded-lg bg-neutral-50 p-2">
        <form action={renameLocation} className="flex gap-2">
          {hidden}
          <input name="name" defaultValue={name} required maxLength={60} aria-label={`Rename ${name}`} className={input} />
          <button className={btn}>Rename</button>
        </form>
        <div className="flex flex-wrap gap-2">
          {!first && (
            <form action={moveLocation}>
              {hidden}
              <input type="hidden" name="direction" value="up" />
              <button className={btn} aria-label={`Move ${name} up`}>
                ↑
              </button>
            </form>
          )}
          {!last && (
            <form action={moveLocation}>
              {hidden}
              <input type="hidden" name="direction" value="down" />
              <button className={btn} aria-label={`Move ${name} down`}>
                ↓
              </button>
            </form>
          )}
          {kind === "shelf" && copies ? null : (
            <form action={deleteLocationAction}>
              {hidden}
              <button className={`${btn} text-red-700`}>Delete {kind}</button>
            </form>
          )}
        </div>
        {kind === "shelf" && copies ? (
          moveTargets?.length ? (
            <form action={moveBooksAndDeleteShelf} className="flex flex-col gap-2">
              <input type="hidden" name="workspace" value={slug} />
              <input type="hidden" name="id" value={id} />
              <label className="text-sm">
                This shelf has {copies} books. Move them to:
                <select name="targetShelfId" required className="mt-1 h-11 w-full rounded-lg border border-neutral-300 px-2">
                  {moveTargets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <button className={`${btn} text-red-700`}>Move books and delete shelf</button>
            </form>
          ) : (
            <p className="text-sm text-neutral-600">Add another shelf first, so its books have somewhere to go.</p>
          )
        ) : null}
      </div>
    </details>
  );
}
