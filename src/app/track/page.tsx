import { TrackOrderForm } from "@/components/orders/TrackOrderForm";

export const metadata = { title: "Track order" };

export default function TrackOrderPage() {
  return (
    <div className="py-10">
      <TrackOrderForm />
    </div>
  );
}
