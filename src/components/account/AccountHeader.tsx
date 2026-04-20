"use client";

import Image from "next/image";
import { formatDistance } from "date-fns";
import type { MeUserDto } from "@/lib/user-me-dto";

export type AccountHeaderUser = Pick<MeUserDto, "name" | "email" | "avatarUrl" | "avatarInitials"> & {
  createdAt?: string | null;
};

function avatarSrc(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  return url.trim();
}

export function AccountHeader({ user, compact }: { user: AccountHeaderUser; compact?: boolean }) {
  const src = avatarSrc(user.avatarUrl ?? null);
  const initials = (user.avatarInitials || "?").slice(0, 3);

  return (
    <div
      className={
        compact
          ? "flex items-center gap-3"
          : "flex items-center gap-3 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-card)] p-4 shadow-[var(--shadow-card)]"
      }
    >
      <div
        className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F5E6D0] font-semibold text-[#C47A2B] ${
          compact ? "h-11 w-11 text-sm" : "h-[44px] w-[44px] text-base"
        }`}
      >
        {src ? (
          <Image src={src} alt="" fill className="object-cover" sizes={compact ? "44px" : "56px"} unoptimized />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate font-semibold text-[var(--brand-ink)] ${compact ? "text-sm" : "text-sm"}`}>
          {user.name}
        </p>
        <p className={`truncate text-[var(--brand-muted)] ${compact ? "text-xs" : "text-xs"}`}>{user.email}</p>
        {user.createdAt && !compact ? (
          <p className="mt-1 text-xs text-[var(--brand-muted)]">
            Member for {formatDistance(new Date(user.createdAt), new Date(), { addSuffix: false })}
          </p>
        ) : null}
      </div>
    </div>
  );
}
