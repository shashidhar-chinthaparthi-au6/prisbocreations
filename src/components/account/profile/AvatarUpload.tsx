"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { apiFetch } from "@/lib/api/fetch-client";
import { uploadCustomerImageToS3 } from "@/lib/api/customer-upload-client";
import { isS3PublicConfigured } from "@/lib/api/upload-progress";
import type { MeUserDto } from "@/lib/user-me-dto";
import { Spinner } from "@/components/ui/Spinner";

export function AvatarUpload({
  avatarUrl,
  avatarInitials,
  onUpdated,
}: {
  avatarUrl: string | null;
  avatarInitials: string;
  onUpdated: (next: { avatarUrl: string | null; avatarInitials: string }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const initials = (avatarInitials || "?").slice(0, 3);
  const src = avatarUrl?.trim() || null;

  async function postAvatar(file: File) {
    if (isS3PublicConfigured()) {
      const url = await uploadCustomerImageToS3(file);
      const data = await apiFetch<{ user: MeUserDto }>("/api/v1/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ profileImageUrl: url }),
      });
      return data.user.avatarUrl ?? url;
    }
    const fd = new FormData();
    fd.append("avatar", file);
    const res = await fetch("/api/account/avatar", {
      method: "POST",
      body: fd,
      credentials: "include",
    });
    const j = (await res.json()) as { ok?: boolean; data?: { avatarUrl: string }; error?: string };
    if (!res.ok || !j.ok || !j.data?.avatarUrl) {
      throw new Error(typeof j.error === "string" ? j.error : "Upload failed");
    }
    return j.data.avatarUrl;
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr(null);
    setBusy(true);
    try {
      const url = await postAvatar(file);
      onUpdated({ avatarUrl: url, avatarInitials });
      window.dispatchEvent(new Event("prisbocreations:profile-updated"));
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function removePhoto() {
    setErr(null);
    setBusy(true);
    try {
      const data = await apiFetch<{ user: { avatarUrl: string | null; avatarInitials: string } }>(
        "/api/v1/auth/me",
        {
          method: "PATCH",
          body: JSON.stringify({ profileImageUrl: "" }),
        },
      );
      onUpdated({
        avatarUrl: data.user.avatarUrl ?? null,
        avatarInitials: data.user.avatarInitials ?? avatarInitials,
      });
      window.dispatchEvent(new Event("prisbocreations:profile-updated"));
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Could not remove");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-card)] p-5">
      <div className="flex flex-wrap items-start gap-5">
        <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full bg-[#F5E6D0] text-2xl font-semibold text-[#C47A2B]">
          {src ? (
            <Image src={src} alt="" fill className="object-cover" sizes="72px" unoptimized />
          ) : (
            <span className="flex h-full w-full items-center justify-center">{initials}</span>
          )}
          {busy ? (
            <span className="absolute inset-0 flex items-center justify-center bg-black/35">
              <Spinner size="sm" className="text-white" />
            </span>
          ) : null}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm text-[var(--brand-muted)]">Initials or uploaded photo</p>
          <div className="flex flex-wrap gap-2">
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPick} />
            <button
              type="button"
              className="rounded-full border border-[var(--brand-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--brand-ink)] hover:bg-[var(--brand-surface)]"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              Change photo
            </button>
            {src ? (
              <button
                type="button"
                className="rounded-full border border-[var(--brand-border)] px-4 py-2 text-sm font-medium text-[var(--brand-muted)] hover:bg-[var(--brand-surface)]"
                disabled={busy}
                onClick={() => void removePhoto()}
              >
                Remove
              </button>
            ) : null}
          </div>
          <p className="text-xs text-[var(--brand-muted)]">JPG or PNG · Max 2MB</p>
          {err ? <p className="text-sm text-[var(--brand-error)]">{err}</p> : null}
        </div>
      </div>
    </div>
  );
}
