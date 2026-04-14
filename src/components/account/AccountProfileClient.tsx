"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/fetch-client";
import { uploadCustomerImageToS3 } from "@/lib/api/customer-upload-client";
import type { MeUserDto } from "@/lib/user-me-dto";
import { UserAvatar } from "@/components/account/UserAvatar";
import { ProfilePhotoCropModal } from "@/components/account/ProfilePhotoCropModal";
import { AddressFormModal, type AddressFormValue } from "@/components/account/AddressFormModal";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Spinner } from "@/components/ui/Spinner";

type Props = {
  initialUser: MeUserDto;
  deniedAdmin?: boolean;
};

export function AccountProfileClient({ initialUser, deniedAdmin }: Props) {
  const [user, setUser] = useState(initialUser);
  const [name, setName] = useState(initialUser.name);
  const [phone, setPhone] = useState(initialUser.phone);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarReloadToken, setAvatarReloadToken] = useState(0);
  const [cropSession, setCropSession] = useState<{
    src: string;
    fileName: string;
    mime: string;
  } | null>(null);

  const [addrOpen, setAddrOpen] = useState(false);
  const [addrMode, setAddrMode] = useState<"add" | "edit">("add");
  const [addrIndex, setAddrIndex] = useState<number | null>(null);
  const [addrErr, setAddrErr] = useState<string | null>(null);
  const [addrSaving, setAddrSaving] = useState(false);

  const refreshUser = useCallback(async () => {
    const data = await apiFetch<{ user: MeUserDto }>("/api/v1/auth/me");
    setUser(data.user);
    setName(data.user.name);
    setPhone(data.user.phone);
    setAvatarReloadToken((t) => t + 1);
  }, []);

  useEffect(() => {
    const src = cropSession?.src;
    return () => {
      if (src) URL.revokeObjectURL(src);
    };
  }, [cropSession?.src]);

  function onAvatarFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCropSession((prev) => {
      if (prev?.src) URL.revokeObjectURL(prev.src);
      return {
        src: URL.createObjectURL(file),
        fileName: file.name,
        mime: file.type && file.type.startsWith("image/") ? file.type : "image/jpeg",
      };
    });
  }

  function closeCropSession() {
    setCropSession((prev) => {
      if (prev?.src) URL.revokeObjectURL(prev.src);
      return null;
    });
  }

  async function uploadAvatarAfterCrop(file: File) {
    setProfileErr(null);
    setAvatarBusy(true);
    try {
      const url = await uploadCustomerImageToS3(file);
      const data = await apiFetch<{ user: MeUserDto }>("/api/v1/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ profileImageUrl: url }),
      });
      setUser(data.user);
      setAvatarReloadToken((t) => t + 1);
      window.dispatchEvent(new Event("prisbocreations:profile-updated"));
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileErr(null);
    setProfileSaving(true);
    try {
      const data = await apiFetch<{ user: MeUserDto }>("/api/v1/auth/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
        }),
      });
      setUser(data.user);
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : "Could not save");
    } finally {
      setProfileSaving(false);
    }
  }

  function openAddAddress() {
    setAddrMode("add");
    setAddrIndex(null);
    setAddrErr(null);
    setAddrOpen(true);
  }

  function openEditAddress(i: number) {
    setAddrMode("edit");
    setAddrIndex(i);
    setAddrErr(null);
    setAddrOpen(true);
  }

  async function saveAddress(form: AddressFormValue) {
    setAddrErr(null);
    setAddrSaving(true);
    try {
      if (addrMode === "add") {
        const data = await apiFetch<{ addresses: MeUserDto["addresses"] }>(
          "/api/v1/auth/me/addresses",
          {
            method: "POST",
            body: JSON.stringify(form),
          },
        );
        setUser((u) => ({ ...u, addresses: data.addresses }));
      } else if (addrIndex !== null) {
        const data = await apiFetch<{ addresses: MeUserDto["addresses"] }>(
          "/api/v1/auth/me/addresses",
          {
            method: "PATCH",
            body: JSON.stringify({ index: addrIndex, address: form }),
          },
        );
        setUser((u) => ({ ...u, addresses: data.addresses }));
      }
      setAddrOpen(false);
    } catch (err) {
      setAddrErr(err instanceof Error ? err.message : "Could not save address");
    } finally {
      setAddrSaving(false);
    }
  }

  async function deleteAddress(i: number) {
    if (!window.confirm("Remove this address?")) return;
    setAddrErr(null);
    try {
      const data = await apiFetch<{ addresses: MeUserDto["addresses"] }>(
        "/api/v1/auth/me/addresses",
        {
          method: "DELETE",
          body: JSON.stringify({ index: i }),
        },
      );
      setUser((u) => ({ ...u, addresses: data.addresses }));
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : "Could not delete");
    }
  }

  const addrInitial =
    addrMode === "edit" && addrIndex !== null ? user.addresses[addrIndex] ?? null : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {deniedAdmin ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <span className="font-semibold">Admin area is restricted.</span> You are signed in as a
          customer.
        </p>
      ) : null}

      <section className="rounded-2xl border border-sand-deep bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="relative shrink-0">
              <UserAvatar
                name={user.name}
                imageUrl={user.profileImageUrl}
                size="lg"
                preferProfileImageApi
                imageReloadToken={avatarReloadToken > 0 ? avatarReloadToken : undefined}
              />
              {avatarBusy ? (
                <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/40">
                  <Spinner size="sm" className="text-white" />
                </span>
              ) : null}
            </div>
            <div>
              <h1 className="font-display text-2xl text-ink">Your profile</h1>
              <p className="mt-1 text-sm text-ink-muted">{user.email}</p>
              <label className="mt-3 inline-flex cursor-pointer text-sm font-medium text-accent hover:underline">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={onAvatarFilePick}
                  disabled={avatarBusy}
                />
                Change photo
              </label>
              <p className="mt-1 text-xs text-ink-muted">
                You&apos;ll crop to a circle before we upload.
              </p>
            </div>
          </div>
          <LogoutButton />
        </div>

        <form onSubmit={saveProfile} className="mt-8 space-y-4 border-t border-sand-deep/60 pt-6">
          <h2 className="font-display text-lg text-ink">Details</h2>
          <label className="block text-sm">
            <span className="text-ink-muted">Display name</span>
            <input
              required
              className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-ink-muted">Phone</span>
            <input
              className="mt-1 w-full rounded-lg border border-sand-deep px-3 py-2"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
            />
          </label>
          {profileErr ? <p className="text-sm text-rose">{profileErr}</p> : null}
          <button
            type="submit"
            disabled={profileSaving}
            className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-ink/90 disabled:opacity-60"
          >
            {profileSaving ? <Spinner size="sm" className="text-white" /> : null}
            Save profile
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-sand-deep bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl text-ink">Saved addresses</h2>
          <button
            type="button"
            onClick={openAddAddress}
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-light"
          >
            Add address
          </button>
        </div>
        <p className="mt-2 text-sm text-ink-muted">
          Use these at checkout. Add several for home, office, or gifts.
        </p>

        {user.addresses.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-sand-deep bg-sand/30 px-4 py-6 text-center text-sm text-ink-muted">
            No addresses yet. Add one to speed up checkout.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {user.addresses.map((a, i) => (
              <li
                key={`${a.line1}-${i}`}
                className="flex flex-col gap-3 rounded-xl border border-sand-deep/80 bg-sand/20 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-ink">{a.fullName}</p>
                  <p className="text-ink-muted">{a.phone}</p>
                  <p className="mt-1 text-ink">
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ""}
                  </p>
                  <p className="text-ink-muted">
                    {a.city}, {a.state} {a.postalCode}
                  </p>
                  <p className="text-xs text-ink-muted">{a.country}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => openEditAddress(i)}
                    className="rounded-full border border-sand-deep px-3 py-1.5 text-xs font-medium text-ink hover:bg-white"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAddress(i)}
                    className="rounded-full border border-rose/30 px-3 py-1.5 text-xs font-medium text-rose hover:bg-rose/10"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-ink-muted">
        <button type="button" onClick={() => void refreshUser()} className="text-accent underline">
          Refresh from server
        </button>
      </p>

      <AddressFormModal
        open={addrOpen}
        title={addrMode === "add" ? "Add address" : "Edit address"}
        initial={addrInitial}
        saving={addrSaving}
        error={addrErr}
        onClose={() => setAddrOpen(false)}
        onSubmit={saveAddress}
      />

      {cropSession ? (
        <ProfilePhotoCropModal
          imageSrc={cropSession.src}
          fileName={cropSession.fileName}
          originalMime={cropSession.mime}
          onClose={closeCropSession}
          onApply={(file) => {
            const src = cropSession.src;
            setCropSession(null);
            queueMicrotask(() => {
              URL.revokeObjectURL(src);
            });
            void uploadAvatarAfterCrop(file);
          }}
        />
      ) : null}
    </div>
  );
}
