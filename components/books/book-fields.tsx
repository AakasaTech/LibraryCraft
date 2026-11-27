export const READ_STATUSES = [
  { value: "UNREAD", label: "Unread" },
  { value: "READING", label: "Reading" },
  { value: "READ", label: "Read" },
] as const;

const select = "h-11 w-full rounded-lg border border-neutral-300 bg-white px-2";

export function ShelfSelect({
  shelves,
  defaultValue,
  name = "shelfId",
}: {
  shelves: { id: string; label: string }[];
  defaultValue?: string | null;
  name?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      Shelf
      <select name={name} defaultValue={defaultValue ?? ""} className={select}>
        <option value="">Not on a shelf</option>
        {shelves.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ReadStatusSelect({ defaultValue = "UNREAD" }: { defaultValue?: string }) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      Reading status
      <select name="readStatus" defaultValue={defaultValue} className={select}>
        {READ_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}
