import Link from "next/link";

export function RTONotice({ variant }: { variant: "rto" | "cancelled" }) {
  const isRto = variant === "rto";
  return (
    <div className="mt-6 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-4 text-sm text-[#7F1D1D]">
      <p className="font-semibold text-[#991B1B]">{isRto ? "Return in progress" : "Order cancelled"}</p>
      <p className="mt-2 text-[#6B6560]">
        {isRto
          ? "Your refund will be processed within 5–7 business days once the return is received."
          : "This shipment was cancelled. If you paid online, a refund will be initiated as per our policy."}
      </p>
      <Link href="/pages/contact" className="mt-3 inline-block font-medium text-[#C47A2B] underline">
        Contact us if you have questions
      </Link>
    </div>
  );
}
