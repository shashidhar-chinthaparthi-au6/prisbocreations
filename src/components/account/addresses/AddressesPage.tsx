"use client";

import { useState } from "react";
import useSWR from "swr";
import { apiFetch } from "@/lib/api/fetch-client";
import type { MeAddressDto } from "@/lib/account/user-address-dto";
import { AddressCard } from "./AddressCard";
import { AddressForm, type AddressFormValues } from "./AddressForm";
import { DeleteAddressModal } from "./DeleteAddressModal";
import { dispatchStoreToast } from "@/components/store/StoreToaster";
import { StoreEmptyState } from "@/components/ui/StoreEmptyState";

type AddrResponse = { addresses: MeAddressDto[]; count: number; max: number };

function isPersistedId(id?: string): boolean {
  return !!id && /^[a-f0-9]{24}$/i.test(id);
}

async function fetcher(url: string): Promise<AddrResponse> {
  return apiFetch<AddrResponse>(url);
}

function meDtoToForm(a: MeAddressDto): AddressFormValues {
  return {
    label: (a.label as AddressFormValues["label"]) ?? "Home",
    fullName: a.fullName,
    phone: a.phone.replace(/\D/g, "").slice(-10),
    line1: a.line1,
    line2: a.line2 ?? "",
    city: a.city,
    state: a.state,
    pincode: a.postalCode.replace(/\D/g, "").slice(0, 6),
    isDefault: a.isDefault === true,
  };
}

export function AddressesPage() {
  const { data, error, mutate, isLoading } = useSWR("/api/account/addresses", fetcher);
  const [mode, setMode] = useState<"idle" | "add" | "edit">("idle");
  const [editTarget, setEditTarget] = useState<MeAddressDto | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<MeAddressDto | null>(null);

  const list = data?.addresses ?? [];
  const atLimit = (data?.count ?? 0) >= (data?.max ?? 10);

  async function saveForm(v: AddressFormValues) {
    setFormErr(null);
    setSaving(true);
    try {
      if (mode === "add") {
        await apiFetch<AddrResponse>("/api/account/addresses", {
          method: "POST",
          body: JSON.stringify({
            label: v.label,
            fullName: v.fullName,
            phone: v.phone,
            line1: v.line1,
            line2: v.line2 || undefined,
            city: v.city,
            state: v.state,
            pincode: v.pincode,
            isDefault: v.isDefault,
          }),
        });
        dispatchStoreToast("Address saved.");
      } else if (mode === "edit" && editTarget?.id && isPersistedId(editTarget.id)) {
        await apiFetch<{ addresses: MeAddressDto[] }>(`/api/account/addresses/${editTarget.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            label: v.label,
            fullName: v.fullName,
            phone: v.phone,
            line1: v.line1,
            line2: v.line2 || undefined,
            city: v.city,
            state: v.state,
            pincode: v.pincode,
            isDefault: v.isDefault,
          }),
        });
        dispatchStoreToast("Address updated.");
      }
      setMode("idle");
      setEditTarget(null);
      await mutate();
      window.dispatchEvent(new Event("prisbocreations:profile-updated"));
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget?.id || !isPersistedId(deleteTarget.id)) return;
    setSaving(true);
    try {
      await apiFetch(`/api/account/addresses/${deleteTarget.id}`, { method: "DELETE" });
      dispatchStoreToast("Address removed.");
      setDeleteTarget(null);
      await mutate();
      window.dispatchEvent(new Event("prisbocreations:profile-updated"));
    } catch (e) {
      dispatchStoreToast(e instanceof Error ? e.message : "Could not delete", { duration: 4000 });
    } finally {
      setSaving(false);
    }
  }

  async function setDefault(a: MeAddressDto) {
    if (!a.id || !isPersistedId(a.id)) return;
    try {
      await apiFetch(`/api/account/addresses/${a.id}/set-default`, { method: "POST" });
      await mutate();
      window.dispatchEvent(new Event("prisbocreations:profile-updated"));
    } catch {
      dispatchStoreToast("Could not update default", { duration: 4000 });
    }
  }

  if (error) {
    return <p className="text-[var(--brand-error)]">Could not load addresses.</p>;
  }

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-[var(--brand-border)]" />
        <div className="h-36 animate-pulse rounded-2xl bg-[var(--brand-border)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-[var(--brand-ink)]">Saved addresses</h1>
        {!atLimit && mode === "idle" ? (
          <button
            type="button"
            className="btn-primary min-h-11 px-6"
            onClick={() => {
              setFormErr(null);
              setEditTarget(null);
              setMode("add");
            }}
          >
            + Add new address
          </button>
        ) : null}
      </div>

      {atLimit ? (
        <p className="text-sm text-[var(--brand-muted)]">
          You&apos;ve reached the limit of 10 saved addresses. Delete one to add a new address.
        </p>
      ) : null}

      {list.length === 0 && mode === "idle" ? (
        <StoreEmptyState
          illustration="pin"
          title="No saved addresses yet"
          description="Save a delivery address so checkout is quicker — you can add labels like Home or Work."
          primary={
            !atLimit
              ? {
                  label: "+ Add your first address",
                  onClick: () => {
                    setFormErr(null);
                    setMode("add");
                  },
                }
              : undefined
          }
        />
      ) : (
        <ul className="space-y-4">
          {list.map((a) => (
            <li key={a.id ?? `${a.line1}-${a.postalCode}`}>
              <AddressCard
                address={a}
                onlyAddress={list.length === 1}
                onEdit={() => {
                  setFormErr(null);
                  setEditTarget(a);
                  setMode("edit");
                }}
                onDelete={() => setDeleteTarget(a)}
                onSetDefault={() => void setDefault(a)}
              />
            </li>
          ))}
        </ul>
      )}

      {mode !== "idle" ? (
        <AddressForm
          formKey={mode === "edit" && editTarget?.id ? editTarget.id : "new"}
          title={mode === "add" ? "Add new address" : "Edit address"}
          initial={mode === "edit" && editTarget ? meDtoToForm(editTarget) : null}
          saving={saving}
          error={formErr}
          onSubmit={(v) => void saveForm(v)}
          onCancel={() => {
            setMode("idle");
            setEditTarget(null);
            setFormErr(null);
          }}
        />
      ) : null}

      <DeleteAddressModal
        open={!!deleteTarget}
        label={deleteTarget?.label ?? "Home"}
        busy={saving}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
