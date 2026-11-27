"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "books", label: "Books" },
  { href: "scan", label: "Scan" },
  { href: "loans", label: "Loans" },
  { href: "settings", label: "Settings" },
];

export function BottomNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-2xl">
        {ITEMS.map(({ href, label }) => {
          const to = `/${slug}/${href}`;
          const active = pathname.startsWith(to);
          return (
            <li key={href} className="flex-1">
              <Link
                href={to}
                aria-current={active ? "page" : undefined}
                className={`flex h-14 items-center justify-center text-sm font-medium ${active ? "text-neutral-900" : "text-neutral-500"}`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
