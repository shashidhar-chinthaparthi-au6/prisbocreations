import type { ReactNode } from "react";
import Link from "next/link";

type Primary =
  | { label: string; href: string }
  | { label: string; onClick: () => void };

export type StoreEmptyIllustration = "package" | "bag" | "heart" | "pin" | "search";

function Illustration({ kind, className }: { kind: StoreEmptyIllustration; className?: string }) {
  const stroke = "#A8A29E";
  const common = { className, "aria-hidden": true as const };
  switch (kind) {
    case "bag":
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.3">
          <path d="M6 7h15l-1.5 9H7.5L6 7z" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 7V5a3 3 0 0 1 3-3v0a3 3 0 0 1 3 3v2" strokeLinecap="round" />
        </svg>
      );
    case "heart":
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.2">
          <path d="M12 21s-6.716-4.196-9-8.5C.8 8.236 2.28 4 6.5 4c2.28 0 3.866 1.582 5.5 3.5C13.634 5.582 15.22 4 17.5 4 21.72 4 23.2 8.236 21 12.5 18.716 16.804 12 21 12 21Z" />
        </svg>
      );
    case "pin":
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.3">
          <path d="M12 22s7-5.5 7-12a7 7 0 1 0-14 0c0 6.5 7 12 7 12z" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case "search":
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.3">
          <circle cx="10.5" cy="10.5" r="6.5" />
          <path d="m16.5 16.5 4 4" strokeLinecap="round" />
        </svg>
      );
    case "package":
    default:
      return (
        <svg {...common} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.3">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="M3.27 6.96 12 12.01l8.73-5.05" />
          <path d="M12 22.08V12" />
        </svg>
      );
  }
}

type Props = {
  illustration?: StoreEmptyIllustration;
  /** Optional emoji shown above title — used when you prefer emoji over SVG */
  emoji?: string;
  title: string;
  description: string;
  /** Extra content between description and actions (e.g. category chips) */
  children?: ReactNode;
  primary?: Primary;
  secondary?: { label: string; href: string } | { label: string; onClick: () => void };
  className?: string;
  /** Tighter padding for drawers / narrow panels */
  compact?: boolean;
};

export function StoreEmptyState({
  illustration = "package",
  emoji,
  title,
  description,
  children,
  primary,
  secondary,
  className = "",
  compact,
}: Props) {
  const pad = compact ? "px-4 py-10" : "px-6 py-14 sm:py-16";
  const iconBox = compact ? "h-12 w-12" : "h-16 w-16 sm:h-[72px] sm:w-[72px]";
  const titleCls = compact ? "text-lg" : "font-display text-xl text-[var(--brand-ink)]";

  return (
    <div
      className={`rounded-2xl border border-dashed border-[var(--brand-border)] bg-[var(--brand-surface)] text-center ${pad} ${className}`}
      role="status"
    >
      <div className={`mx-auto mb-4 flex ${iconBox} items-center justify-center text-[var(--brand-muted)]`}>
        {emoji ? (
          <span className="text-5xl leading-none opacity-50" aria-hidden>
            {emoji}
          </span>
        ) : (
          <Illustration kind={illustration} className="h-full w-full" />
        )}
      </div>
      <h2
        className={
          compact ? "font-display text-lg font-semibold text-[var(--brand-ink)]" : titleCls
        }
      >
        {title}
      </h2>
      <p className={`mx-auto mt-2 max-w-sm text-sm text-[var(--brand-muted)] ${compact ? "text-xs sm:text-sm" : ""}`}>
        {description}
      </p>
      {children ? <div className="mt-6 w-full">{children}</div> : null}
      {primary || secondary ? (
      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        {primary ? (
          "href" in primary ? (
            <Link href={primary.href} className="btn-primary inline-flex min-h-11 justify-center px-6">
              {primary.label}
            </Link>
          ) : (
            <button type="button" onClick={primary.onClick} className="btn-primary min-h-11 px-6">
              {primary.label}
            </button>
          )
        ) : null}
        {secondary ? (
          "href" in secondary ? (
            <Link
              href={secondary.href}
              className="text-sm font-medium text-[var(--brand-amber)] hover:underline"
            >
              {secondary.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={secondary.onClick}
              className="text-sm font-medium text-[var(--brand-amber)] hover:underline"
            >
              {secondary.label}
            </button>
          )
        ) : null}
      </div>
      ) : null}
    </div>
  );
}
