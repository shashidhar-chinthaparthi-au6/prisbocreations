"use client";

import { useEffect, useRef, useState } from "react";
import type { MeAddressDto } from "@/lib/account/user-address-dto";

export function AddressCard({
  address,
  onlyAddress,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address: MeAddressDto;
  onlyAddress: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isDefault = address.isDefault === true;
  const canDelete = !(isDefault && onlyAddress);
  const label = address.label ?? "Home";

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false);
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-card)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-[var(--brand-ink)]">{label}</span>
          {isDefault ? (
            <span className="rounded-md bg-[#F5E6D0] px-2 py-0.5 text-xs font-medium text-[#9A5E1E]">
              Default
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-full border border-[var(--brand-border)] px-3 py-1 text-xs font-medium text-[var(--brand-ink)] hover:bg-[var(--brand-surface)]"
          >
            Edit
          </button>
          <div className="relative" ref={ref}>
            <button
              type="button"
              className="rounded-full px-2 py-1 text-lg leading-none text-[var(--brand-muted)] hover:bg-[var(--brand-surface)]"
              aria-label="More"
              onClick={() => setMenu((m) => !m)}
            >
              ···
            </button>
            {menu ? (
              <div className="absolute right-0 z-10 mt-1 min-w-[180px] rounded-xl border border-[var(--brand-border)] bg-[var(--brand-card)] py-1 text-sm shadow-[var(--shadow-modal)]">
                {!isDefault ? (
                  <button
                    type="button"
                    className="block w-full px-4 py-2 text-left hover:bg-[var(--brand-surface)]"
                    onClick={() => {
                      setMenu(false);
                      onSetDefault();
                    }}
                  >
                    Set as default
                  </button>
                ) : null}
                <button
                  type="button"
                  className="block w-full px-4 py-2 text-left hover:bg-[var(--brand-surface)]"
                  onClick={() => {
                    setMenu(false);
                    onEdit();
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  title={!canDelete ? "Set another address as default first." : undefined}
                  disabled={!canDelete}
                  className="block w-full px-4 py-2 text-left text-[var(--brand-error)] hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => {
                    if (!canDelete) return;
                    setMenu(false);
                    onDelete();
                  }}
                >
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <p className="mt-2 text-sm text-[var(--brand-ink)]">
        {address.fullName} · {address.phone}
      </p>
      <p className="mt-1 text-sm text-[var(--brand-muted)]">{address.line1}</p>
      {address.line2 ? <p className="text-sm text-[var(--brand-muted)]">{address.line2}</p> : null}
      <p className="text-sm text-[var(--brand-muted)]">
        {address.city}, {address.state} {address.postalCode}
      </p>
      <p className="text-sm text-[var(--brand-muted)]">{address.country}</p>
    </div>
  );
}
