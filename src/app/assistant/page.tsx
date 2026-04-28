import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getAssistantEnabledCached } from "@/lib/services/storefrontSettingsService";
import { AssistantPageClient } from "./AssistantPageClient";

export const metadata: Metadata = {
  title: "Shop with Assistant",
  description:
    "Chat with Prisbo Assistant for gift ideas and catalogue search — personalised keepsakes made in-studio.",
};

export default async function AssistantPage() {
  if (!(await getAssistantEnabledCached())) {
    redirect("/");
  }

  return (
    <Suspense
      fallback={
        <div className="animate-pulse px-4 pb-24 pt-[calc(var(--storefront-header-h,5rem)+2rem)] text-center text-sm text-[var(--brand-muted)]">
          Loading assistant…
        </div>
      }
    >
      <AssistantPageClient />
    </Suspense>
  );
}
