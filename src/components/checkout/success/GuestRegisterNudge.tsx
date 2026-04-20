import Link from "next/link";

export function GuestRegisterNudge({
  guestEmail,
  shippingFullName,
}: {
  guestEmail: string;
  shippingFullName?: string;
}) {
  const emailQ = guestEmail.trim().toLowerCase();
  const nameQ = shippingFullName?.trim() ?? "";
  const qs = new URLSearchParams();
  if (emailQ) qs.set("email", emailQ);
  if (nameQ) qs.set("name", nameQ);
  qs.set("redirect", "/account/orders");
  const href = qs.toString() ? `/register?${qs.toString()}` : "/register";

  return (
    <div className="mt-6 rounded-xl border border-[#E8E0D6] bg-[#FDFAF7] px-5 py-5 sm:px-6">
      <p className="text-[15px] font-semibold text-[#1A1A1A]">Save your order history</p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[#6B6560]">
        Create a free account to track this order, save your address, and checkout faster next time.
      </p>
      <Link
        href={href}
        className="mt-4 inline-flex rounded-full bg-[#C47A2B] px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-[#9A5E1E]"
      >
        Create account →
      </Link>
    </div>
  );
}
