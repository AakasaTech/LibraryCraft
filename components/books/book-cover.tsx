type Props = { title: string; coverUrl: string | null; className?: string };

/** Covers are hot-linked from the catalogues (see the open question in docs/SPEC.md). */
export function BookCover({ title, coverUrl, className = "w-24" }: Props) {
  return (
    <div className={`${className} aspect-[2/3] shrink-0 overflow-hidden rounded-md bg-neutral-100`}>
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote covers redirect across hosts; next/image adds nothing here
        <img src={coverUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center p-2 text-center text-xs text-neutral-500">{title}</div>
      )}
    </div>
  );
}
