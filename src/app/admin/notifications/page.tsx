import { formatDistanceToNow } from "date-fns";
import { connectDb } from "@/lib/db";
import { NotificationLog } from "@/lib/models/NotificationLog";

export const metadata = { title: "Admin · Notifications" };

export default async function AdminNotificationsPage() {
  await connectDb();
  const rows = await NotificationLog.find().sort({ sentAt: -1 }).limit(200).lean();

  return (
    <div className="space-y-6">
      <h2 className="font-display text-2xl text-ink">Notifications</h2>
      <p className="text-sm text-zinc-600">
        Recent transactional emails and SMS (masked recipients). Latest 200 entries.
      </p>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-600">
            <tr>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Channel</th>
              <th className="px-4 py-3">Recipient</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  No notification logs yet.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={String(r._id)} className="hover:bg-zinc-50/80">
                  <td className="px-4 py-3 font-medium text-zinc-900">{r.event}</td>
                  <td className="px-4 py-3 text-zinc-700">{r.channel}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-600">{r.recipient}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {r.orderId ? `#${String(r.orderId).slice(-8)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        r.status === "sent"
                          ? "text-emerald-700"
                          : r.status === "failed"
                            ? "text-rose-700"
                            : "text-zinc-600"
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {r.sentAt
                      ? formatDistanceToNow(new Date(r.sentAt), { addSuffix: true })
                      : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
