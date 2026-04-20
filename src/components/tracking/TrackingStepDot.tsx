type DotState = "done" | "current" | "future" | "error";

const AMBER = "#C47A2B";
const RING = "#F5E6D0";
const GRAY = "#D3D1C7";
const RED = "#991B1B";

export function TrackingStepDot({ state }: { state: DotState }) {
  if (state === "error") {
    return (
      <div
        className="relative z-[1] flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#991B1B]"
        style={{ border: `2px solid ${RED}` }}
        aria-hidden
      >
        ✕
      </div>
    );
  }
  if (state === "future") {
    return (
      <div
        className="relative z-[1] h-[14px] w-[14px] shrink-0 rounded-full bg-white"
        style={{ border: `2px solid ${GRAY}` }}
        aria-hidden
      />
    );
  }
  if (state === "current") {
    return (
      <div
        className="relative z-[1] h-[14px] w-[14px] shrink-0 animate-pulse rounded-full"
        style={{
          backgroundColor: AMBER,
          boxShadow: `0 0 0 4px ${RING}`,
        }}
        aria-hidden
      />
    );
  }
  return (
    <div
      className="relative z-[1] h-[14px] w-[14px] shrink-0 rounded-full"
      style={{ backgroundColor: AMBER }}
      aria-hidden
    />
  );
}
