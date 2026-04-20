import { Suspense } from "react";
import { ProfilePage } from "@/components/account/profile/ProfilePage";

export const metadata = { title: "Profile" };

function ProfileFallback() {
  return (
    <div className="mx-auto max-w-[560px]">
      <h1 className="font-display text-2xl text-[var(--brand-ink)]">Profile</h1>
      <div className="mt-6 h-40 animate-pulse rounded-2xl bg-[var(--brand-border)]" />
    </div>
  );
}

export default async function AccountProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const sp = await searchParams;
  return (
    <Suspense fallback={<ProfileFallback />}>
      <ProfilePage deniedAdmin={sp.denied === "admin"} />
    </Suspense>
  );
}
