import Link from "next/link";

export function AdminBreadcrumb({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav className="mb-6 text-sm text-zinc-500">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-2">
            {i > 0 ? <span className="text-zinc-300">/</span> : null}
            {item.href ?
              <Link href={item.href} className="hover:text-zinc-900">
                {item.label}
              </Link>
            : <span className="font-medium text-zinc-900">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
