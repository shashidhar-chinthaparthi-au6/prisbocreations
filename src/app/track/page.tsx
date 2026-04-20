import { Suspense } from "react";
import { TrackPageClient } from "@/app/track/TrackPageClient";

export const metadata = { title: "Track order" };

export default function TrackOrderPage() {
  return (
    <div className="min-h-screen bg-[#FDFAF7]">
      <Suspense
        fallback={
          <div className="mx-auto max-w-[640px] px-4 py-10 text-sm text-[#6B6560]">Loading…</div>
        }
      >
        <TrackPageClient />
      </Suspense>
    </div>
  );
}
