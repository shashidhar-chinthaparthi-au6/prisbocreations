export function AdminReplyBlock({ text }: { text: string }) {
  return (
    <div
      className="mt-4 border-l-[3px] border-[var(--am)] bg-[var(--aml)] px-3 py-2 text-sm text-[var(--brand-ink)]"
      style={{ borderRadius: "0 8px 8px 0" }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-muted)]">
        Store reply
      </p>
      <p className="mt-1 leading-relaxed">{text}</p>
      <p className="mt-2 text-xs font-medium text-[var(--am)]">— Prisbo Creations Team</p>
    </div>
  );
}
