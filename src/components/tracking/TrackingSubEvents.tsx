import { format } from "date-fns";

type Row = { eventAt: string; description?: string | null; location?: string | null; status: string };

export function TrackingSubEvents({ rows }: { rows: Row[] }) {
  if (rows.length < 2) return null;
  const [, ...rest] = [...rows].sort(
    (a, b) => new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime(),
  );
  if (!rest.length) return null;
  return (
    <ul className="mt-2 space-y-1 border-l border-[#E8E4DC] pl-3 text-xs text-[#6B6560]">
      {rest.map((r, i) => {
        const d = new Date(r.eventAt);
        const line = r.description?.trim() || r.status;
        const loc = r.location?.trim();
        return (
          <li key={`${r.eventAt}-${i}`}>
            ↳ {format(d, "d MMM h:mm a")} · {line}
            {loc ? ` · ${loc}` : ""}
          </li>
        );
      })}
    </ul>
  );
}
