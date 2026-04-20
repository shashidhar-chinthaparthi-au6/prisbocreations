"use client";

type StepIndicatorProps = {
  labels: string[];
  current: number;
};

export function StepIndicator({ labels, current }: StepIndicatorProps) {
  return (
    <nav aria-label="Checkout progress" className="w-full">
      <ol className="flex flex-wrap items-start justify-between gap-2 sm:gap-0">
        {labels.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li key={label} className="flex min-w-0 flex-1 items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold sm:h-9 sm:w-9 ${
                    active
                      ? "bg-[#C47A2B] text-white"
                      : done
                        ? "bg-[#C47A2B] text-white"
                        : "border border-[#E8E0D6] bg-white text-[#9A8F85]"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                <span
                  className={`hidden min-w-0 truncate text-xs font-medium sm:block ${
                    active ? "text-[#3D3835]" : done ? "text-[#6B6560]" : "text-[#9A8F85]"
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < labels.length - 1 ? (
                <span
                  className={`mx-0.5 hidden h-px min-w-[0.5rem] flex-1 sm:block ${
                    done ? "bg-[#C47A2B]" : "bg-[#E8E0D6]"
                  }`}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
