"use client";

type Props = {
  title: string;
  subtitle?: string;
  showing: number;
  total: number;
};

export function ListingTopbar({ title, subtitle, showing, total }: Props) {
  return (
    <div className="flex flex-col gap-2 border-t border-[var(--brand-ink)]/10 pt-4 md:flex-row md:items-center md:justify-between md:gap-4">
      <div className="min-w-0 flex-1">
        <h1 className="sr-only">{title}</h1>
        {subtitle ? (
          <p className="text-[13px] text-[var(--muted)]">{subtitle}</p>
        ) : null}
        <p className="text-[13px] text-[var(--muted)]">
          {total} {total === 1 ? "piece" : "pieces"} to explore
          {showing < total ? ` · showing ${showing}` : ""}
        </p>
      </div>
    </div>
  );
}
