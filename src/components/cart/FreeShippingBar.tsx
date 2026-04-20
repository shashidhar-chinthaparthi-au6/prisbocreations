"use client";

import { freeShippingMinPaise, qualifiesForFreeShipping } from "@/lib/free-shipping";
import { formatInrFromPaise } from "@/lib/format";

export function FreeShippingBar({ subtotalPaise }: { subtotalPaise: number }) {
  const min = freeShippingMinPaise();
  const ok = qualifiesForFreeShipping(subtotalPaise);
  const remain = Math.max(0, min - subtotalPaise);
  const pct = ok ? 100 : Math.min(100, Math.round((subtotalPaise / min) * 100));

  if (ok) {
    return (
      <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-xs font-medium text-emerald-950">
        Free shipping on this order ✓
      </div>
    );
  }

  return (
    <div className="mb-3">
      <div className="mb-1 flex justify-between text-[11px] text-[#6B6560]">
        <span>Free shipping progress</span>
        <span>Add {formatInrFromPaise(remain)} more</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#F5E6D0]">
        <div
          className="h-full rounded-full bg-[#C47A2B] transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
