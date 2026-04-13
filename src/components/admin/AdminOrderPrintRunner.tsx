"use client";

import { useEffect } from "react";
import type { AdminOrderFull } from "@/lib/admin-order-types";
import {
  AdminOrderPrintOverlay,
  type AdminPrintKind,
} from "@/components/admin/AdminOrderPrintOverlay";

type Props = {
  order: AdminOrderFull;
  kind: AdminPrintKind;
  onDismiss: () => void;
};

export function AdminOrderPrintRunner({ order, kind, onDismiss }: Props) {
  useEffect(() => {
    document.documentElement.classList.add("admin-order-print-active");
    const id = window.requestAnimationFrame(() => window.print());
    const onAfterPrint = () => {
      document.documentElement.classList.remove("admin-order-print-active");
      onDismiss();
    };
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("afterprint", onAfterPrint);
      document.documentElement.classList.remove("admin-order-print-active");
    };
  }, [order, kind, onDismiss]);

  return (
    <div className="admin-print-root fixed inset-0 z-[200] overflow-y-auto bg-white print:static print:inset-auto">
      <div className="sticky top-0 z-[1] flex flex-wrap items-center justify-between gap-2 border-b border-sand-deep bg-white px-4 py-3 print:hidden">
        <p className="text-sm text-ink-muted">
          {kind === "invoice" ? "Invoice preview" : "Posting label preview"} — Print or Save as PDF
        </p>
        <button
          type="button"
          className="rounded-full border border-sand-deep px-3 py-1.5 text-sm text-ink hover:border-ink"
          onClick={onDismiss}
        >
          Close preview
        </button>
      </div>
      <div className="p-4 print:p-0">
        <AdminOrderPrintOverlay order={order} kind={kind} />
      </div>
    </div>
  );
}
