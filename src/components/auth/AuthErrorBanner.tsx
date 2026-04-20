export function AuthErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-[#F09595] bg-[#FCEBEB] px-3.5 py-2.5 text-[13px] text-[#A32D2D]"
    >
      <span className="mr-1.5 inline-block font-semibold" aria-hidden>
        !
      </span>
      {children}
    </div>
  );
}
