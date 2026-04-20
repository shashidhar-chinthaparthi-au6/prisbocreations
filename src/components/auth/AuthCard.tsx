import Link from "next/link";

export function AuthCard({
  children,
  maxWidthClass = "max-w-[440px]",
}: {
  children: React.ReactNode;
  maxWidthClass?: string;
}) {
  return (
    <div
      className={`mx-auto w-full ${maxWidthClass} rounded-2xl border border-[#E8E0D6] bg-white px-6 py-7 shadow-sm sm:px-12 sm:py-10`}
    >
      <div className="mb-8 text-center">
        <Link
          href="/"
          className="font-display text-lg font-normal tracking-tight text-[#1A1A1A] sm:text-xl"
        >
          <span className="text-[var(--brand-ink)]">Prisbo</span>{" "}
          <span className="text-[#C47A2B]">Creations</span>
        </Link>
      </div>
      {children}
    </div>
  );
}
