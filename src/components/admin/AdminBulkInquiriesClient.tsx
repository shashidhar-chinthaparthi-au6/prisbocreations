"use client";

import { useEffect, useState } from "react";

type Inquiry = {
  _id: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  productInterest?: string;
  quantity?: number;
  deadlineDate?: string;
  notes?: string;
  status: "new" | "contacted" | "won" | "lost";
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  contacted: "bg-yellow-100 text-yellow-800",
  won: "bg-green-100 text-green-800",
  lost: "bg-gray-100 text-gray-600",
};

export function AdminBulkInquiriesClient() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch("/api/v1/bulk-inquiries");
      if (!res.ok) throw new Error("Failed to load inquiries");
      const json = (await res.json()) as { data: Inquiry[] };
      setInquiries(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error loading inquiries");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, status: string) {
    await fetch(`/api/v1/bulk-inquiries?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setInquiries((prev) =>
      prev.map((i) => (i._id === id ? { ...i, status: status as Inquiry["status"] } : i)),
    );
  }

  useEffect(() => { load(); }, []);

  if (loading) return <p className="text-ink-muted text-sm">Loading…</p>;
  if (error) return <p className="text-red-600 text-sm">{error}</p>;
  if (inquiries.length === 0)
    return (
      <div className="bg-sand rounded-xl p-8 text-center text-ink-muted text-sm">
        No bulk inquiries yet.
      </div>
    );

  return (
    <div className="space-y-4">
      {inquiries.map((inq) => (
        <div
          key={inq._id}
          className="bg-white border border-sand-deep rounded-xl p-5 space-y-3"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="font-semibold text-ink">{inq.company}</p>
              <p className="text-sm text-ink-muted">
                {inq.contactName} · {new Date(inq.createdAt).toLocaleDateString("en-IN")}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_COLORS[inq.status] ?? ""}`}
              >
                {inq.status}
              </span>
              <select
                value={inq.status}
                onChange={(e) => updateStatus(inq._id, e.target.value)}
                className="text-xs border border-sand-deep rounded-lg px-2 py-1 bg-white text-ink"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-ink-muted mb-0.5">Email</p>
              <a href={`mailto:${inq.email}`} className="text-accent hover:underline break-all">
                {inq.email}
              </a>
            </div>
            <div>
              <p className="text-xs text-ink-muted mb-0.5">Phone</p>
              <a href={`tel:${inq.phone}`} className="text-ink hover:underline">
                {inq.phone}
              </a>
            </div>
            {inq.productInterest && (
              <div>
                <p className="text-xs text-ink-muted mb-0.5">Product interest</p>
                <p className="text-ink">{inq.productInterest}</p>
              </div>
            )}
            {inq.quantity && (
              <div>
                <p className="text-xs text-ink-muted mb-0.5">Quantity</p>
                <p className="text-ink">{inq.quantity} units</p>
              </div>
            )}
            {inq.deadlineDate && (
              <div>
                <p className="text-xs text-ink-muted mb-0.5">Required by</p>
                <p className="text-ink">
                  {new Date(inq.deadlineDate).toLocaleDateString("en-IN")}
                </p>
              </div>
            )}
          </div>

          {inq.notes && (
            <div className="bg-sand rounded-lg px-4 py-3 text-sm text-ink whitespace-pre-wrap">
              {inq.notes}
            </div>
          )}

          <a
            href={`https://wa.me/${inq.phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi ${inq.contactName}, thank you for reaching out to Prisbo Creations regarding your bulk order inquiry (${inq.productInterest ?? "personalised gifts"}). We'd love to help!`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 rounded-full px-3 py-1.5 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Reply on WhatsApp
          </a>
        </div>
      ))}
    </div>
  );
}
