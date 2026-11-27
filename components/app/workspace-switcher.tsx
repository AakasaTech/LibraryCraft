"use client";
import { useRouter } from "next/navigation";

type Props = { current: string; workspaces: { slug: string; name: string }[] };

export function WorkspaceSwitcher({ current, workspaces }: Props) {
  const router = useRouter();
  return (
    <select
      aria-label="Switch library"
      value={current}
      onChange={(e) => router.push(e.target.value === "__new" ? "/onboarding" : `/${e.target.value}`)}
      className="h-11 max-w-[60vw] truncate rounded-lg border border-neutral-300 bg-white px-2 font-medium"
    >
      {workspaces.map((w) => (
        <option key={w.slug} value={w.slug}>
          {w.name}
        </option>
      ))}
      <option value="__new">+ New library</option>
    </select>
  );
}
