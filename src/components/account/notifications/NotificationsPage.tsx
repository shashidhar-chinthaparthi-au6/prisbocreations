"use client";

import useSWR from "swr";
import { apiFetch } from "@/lib/api/fetch-client";
import type { MeUserDto } from "@/lib/user-me-dto";
import { NotificationToggleRow } from "./NotificationToggleRow";

async function meFetcher(): Promise<MeUserDto> {
  const d = await apiFetch<{ user: MeUserDto }>("/api/v1/auth/me");
  return d.user;
}

export function NotificationsPage() {
  const { data, error, mutate, isLoading } = useSWR("account-me-notifs", meFetcher);

  async function patch(partial: {
    notifOrderUpdates?: boolean;
    notifOffers?: boolean;
    notifSMS?: boolean;
  }) {
    await apiFetch("/api/account/notifications", {
      method: "PATCH",
      body: JSON.stringify(partial),
    });
    await mutate();
  }

  if (error) {
    return <p className="text-[var(--brand-error)]">Could not load preferences.</p>;
  }

  if (isLoading || !data) {
    return <div className="h-40 animate-pulse rounded-2xl bg-[var(--brand-border)]" />;
  }

  return (
    <div className="mx-auto max-w-[520px] space-y-2">
      <h1 className="font-display text-2xl text-[var(--brand-ink)]">Notification preferences</h1>
      <div className="mt-6 rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-card)] px-4 shadow-[var(--shadow-card)]">
        <NotificationToggleRow
          title="Order updates"
          description="Email me when my order status changes (confirmed, dispatched, out for delivery, delivered)."
          checked={data.notifOrderUpdates}
          onChange={(next) => patch({ notifOrderUpdates: next })}
        />
        <NotificationToggleRow
          title="SMS updates"
          description="SMS for dispatch and delivery."
          checked={data.notifSMS}
          onChange={(next) => patch({ notifSMS: next })}
        />
        <NotificationToggleRow
          title="Offers & promotions"
          description="Email me about new products and special offers."
          checked={data.notifOffers}
          onChange={(next) => patch({ notifOffers: next })}
        />
      </div>
    </div>
  );
}
