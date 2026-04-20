"use client";

import Link from "next/link";
import { format } from "date-fns";

export function DangerZone({
  memberSinceIso,
  orderCount,
}: {
  memberSinceIso: string | null;
  orderCount: number;
}) {
  const memberLabel = memberSinceIso
    ? format(new Date(memberSinceIso), "d MMM yyyy")
    : "—";

  return (
    <section className="mt-10 border-t border-[var(--brand-border)] pt-8">
      <h2 className="text-lg font-semibold text-[var(--brand-ink)]">Account</h2>
      <dl className="mt-4 grid gap-2 text-sm text-[var(--brand-muted)] sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide">Member since</dt>
          <dd className="font-medium text-[var(--brand-ink)]">{memberLabel}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide">Total orders</dt>
          <dd className="font-medium text-[var(--brand-ink)]">{orderCount}</dd>
        </div>
      </dl>
      <div className="mt-6">
        <Link
          href="/account/delete"
          className="inline-flex rounded-full border-2 border-[var(--brand-error)] bg-transparent px-5 py-2.5 text-sm font-semibold text-[var(--brand-error)] hover:bg-red-50"
        >
          Delete my account →
        </Link>
      </div>
    </section>
  );
}
