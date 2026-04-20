export function TrackingSkeletonLoader() {
  return (
    <div className="animate-pulse space-y-4 py-2" aria-hidden>
      <div className="h-4 w-3/4 max-w-md rounded bg-[#E8E4DC]" />
      <div className="h-4 w-1/2 max-w-sm rounded bg-[#E8E4DC]" />
      <div className="mt-8 space-y-6 border-l-2 border-dashed border-[#D3D1C7] pl-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-40 rounded bg-[#E8E4DC]" />
            <div className="h-3 w-56 rounded bg-[#F0EBE3]" />
            <div className="h-3 w-24 rounded bg-[#F0EBE3]" />
          </div>
        ))}
      </div>
    </div>
  );
}
