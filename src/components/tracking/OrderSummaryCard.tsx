import Image from "next/image";
import type { TrackPayload } from "@/types/track-payload";
import { formatInrFromPaise } from "@/lib/format";

export function OrderSummaryCard({
  data,
  addressMode,
}: {
  data: TrackPayload;
  addressMode: "public" | "account";
}) {
  const addr = data.shippingAddress;
  const addrLine =
    addressMode === "public"
      ? [addr.fullName, [addr.city, addr.state].filter(Boolean).join(", "), addr.postalCode]
          .filter(Boolean)
          .join(" · ")
      : [
          addr.fullName,
          addr.line1,
          addr.line2,
          [addr.city, addr.state, addr.postalCode].filter(Boolean).join(", "),
          addr.country,
          addr.phone ? `Phone: ${addr.phone}` : "",
        ]
          .filter(Boolean)
          .join(", ");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#E8E4DC] bg-white px-4 py-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#F5E6D0] text-lg">
            📦
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#1A1A1A]">{data.courierName}</p>
            {data.estimatedDelivery ? (
              <p className="mt-1 text-sm text-[#6B6560]">Estimated: {data.estimatedDelivery}</p>
            ) : null}
            {data.awbCode ? (
              <p className="mt-2 font-mono text-sm text-[#1A1A1A]">
                <span className="text-[#6B6560]">AWB:</span> {data.awbCode}
              </p>
            ) : (
              <p className="mt-2 text-sm text-[#6B6560]">AWB will appear once the shipment is booked.</p>
            )}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6B6560]">Items in this order</h3>
        <ul className="mt-3 flex flex-wrap gap-3">
          {data.items.map((it, i) => (
            <li key={i} className="flex max-w-[200px] min-w-0 items-center gap-2 text-sm">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-[#F5F0E8]">
                {it.imageUrl ? (
                  <Image src={it.imageUrl} alt="" fill className="object-cover" />
                ) : null}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-[#1A1A1A]">{it.name}</p>
                {it.variant ? <p className="truncate text-xs text-[#6B6560]">{it.variant}</p> : null}
                <p className="text-xs text-[#6B6560]">×{it.quantity}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {addressMode === "account" ? (
        <div className="border-t border-[#E8E4DC] pt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6B6560]">Payment</h3>
          <div className="mt-2 space-y-1 text-sm text-[#6B6560]">
            <div className="flex justify-between gap-4">
              <span>Subtotal</span>
              <span className="text-[#1A1A1A]">{formatInrFromPaise(data.subtotalPaise)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Shipping</span>
              <span className="text-[#1A1A1A]">{formatInrFromPaise(data.shippingPaise)}</span>
            </div>
            {data.discountPaise > 0 ? (
              <div className="flex justify-between gap-4">
                <span>Discount</span>
                <span className="text-[#1A1A1A]">-{formatInrFromPaise(data.discountPaise)}</span>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-[#E8E4DC] pt-2 font-semibold text-[#1A1A1A]">
              <span>Total</span>
              <span>{formatInrFromPaise(data.totalPaise)}</span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="border-t border-[#E8E4DC] pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-[#6B6560]">
          {addressMode === "public" ? "Delivering to" : "Shipping address"}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[#1A1A1A]">{addrLine}</p>
      </div>
    </div>
  );
}
