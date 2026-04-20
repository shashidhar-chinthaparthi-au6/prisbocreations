"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { AvatarUpload } from "./AvatarUpload";
import { PersonalInfoForm } from "./PersonalInfoForm";
import { DangerZone } from "./DangerZone";
import { dispatchStoreToast } from "@/components/store/StoreToaster";
import { computeInitials } from "@/lib/account/compute-initials";

type ProfilePayload = {
  fullName: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  avatarInitials: string;
  memberSince: string | null;
  orderCount: number;
  pendingEmailChange: string | null;
};

async function profileFetcher(url: string): Promise<ProfilePayload> {
  const res = await fetch(url, { credentials: "include" });
  const j = (await res.json()) as { ok?: boolean; data?: ProfilePayload; error?: string };
  if (!res.ok || !j.ok || !j.data) {
    throw new Error(typeof j.error === "string" ? j.error : "Failed to load profile");
  }
  return j.data;
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-24 rounded-2xl bg-[var(--brand-border)]" />
      <div className="h-40 rounded-2xl bg-[var(--brand-border)]" />
      <div className="h-32 rounded-2xl bg-[var(--brand-border)]" />
    </div>
  );
}

export function ProfilePage({ deniedAdmin }: { deniedAdmin?: boolean }) {
  const sp = useSearchParams();
  const { data, error, mutate, isLoading } = useSWR("/api/account/profile", profileFetcher);
  const [localAvatar, setLocalAvatar] = useState<{ url: string | null; initials: string } | null>(null);

  useEffect(() => {
    const v = sp.get("verified");
    if (v === "true") {
      dispatchStoreToast("Your email has been verified.", { duration: 4000 });
      window.history.replaceState({}, "", "/account/profile");
      void mutate();
    } else if (v === "invalid" || v === "taken") {
      dispatchStoreToast(
        v === "taken" ? "That email is no longer available." : "This verification link is invalid or expired.",
        { duration: 5000 },
      );
      window.history.replaceState({}, "", "/account/profile");
    }
  }, [sp, mutate]);

  const display = useMemo(() => {
    if (!data) return null;
    const initials =
      localAvatar?.initials ??
      (data.fullName ? computeInitials(data.fullName) : data.avatarInitials);
    return {
      ...data,
      avatarUrl: localAvatar?.url ?? data.avatarUrl,
      avatarInitials: initials,
    };
  }, [data, localAvatar]);

  if (error) {
    return (
      <p className="text-[var(--brand-error)]">
        {error instanceof Error ? error.message : "Something went wrong"}
      </p>
    );
  }

  if (isLoading || !data || !display) {
    return (
      <div className="mx-auto max-w-[560px]">
        <h1 className="font-display text-2xl text-[var(--brand-ink)]">Profile</h1>
        <div className="mt-6">
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[560px] space-y-8">
      {deniedAdmin ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <span className="font-semibold">Admin area is restricted.</span> You are signed in as a customer.
        </p>
      ) : null}

      <h1 className="font-display text-2xl text-[var(--brand-ink)]">Profile</h1>

      {data.pendingEmailChange ? (
        <p className="rounded-xl border border-[var(--brand-amber)]/40 bg-[var(--brand-amber-light)] px-4 py-3 text-sm text-[var(--brand-ink)]">
          Check <strong className="font-semibold">{data.pendingEmailChange}</strong> — your new address needs
          confirmation before we switch your login email.
        </p>
      ) : null}

      <AvatarUpload
        avatarUrl={display.avatarUrl}
        avatarInitials={display.avatarInitials}
        onUpdated={(next) => {
          setLocalAvatar({ url: next.avatarUrl, initials: next.avatarInitials });
          void mutate();
        }}
      />

      <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-card)] p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-base font-semibold text-[var(--brand-ink)]">Personal information</h2>
        <div className="mt-4">
          <PersonalInfoForm
            serverEmail={data.email}
            initial={{
              fullName: data.fullName,
              email: data.email,
              phone: data.phone,
            }}
            onSaved={() => void mutate()}
          />
        </div>
      </div>

      <DangerZone memberSinceIso={data.memberSince} orderCount={data.orderCount} />
    </div>
  );
}
