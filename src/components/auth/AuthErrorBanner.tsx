"use client";

export function AuthErrorBanner({
  message,
  children,
  onDismiss,
}: {
  message?: string;
  children?: React.ReactNode;
  onDismiss?: () => void;
}) {
  const content = message ?? children;
  if (content == null || content === "") return null;

  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-[#F09595] bg-[#FCEBEB] px-3 py-2.5 text-sm text-[#A32D2D]"
    >
      <span className="shrink-0 font-semibold" aria-hidden>
        !
      </span>
      <div className="min-w-0 flex-1 leading-snug">{content}</div>
      {onDismiss ? (
        <button type="button" onClick={onDismiss} className="shrink-0 text-[#A32D2D] underline">
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
