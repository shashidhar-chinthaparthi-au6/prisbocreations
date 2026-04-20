"use client";

import { useWishlist } from "@/hooks/useWishlist";
import { dispatchStoreToast } from "@/components/store/StoreToaster";

type Props = {
  productId: string;
  productName?: string;
  size?: "sm" | "md";
  /** When true, removing shows an undo toast (wishlist page). */
  showRemoveUndo?: boolean;
  className?: string;
  /** Tighter hit area for product grid cards (22px mobile / 26px desktop). */
  density?: "default" | "compact";
};

export function WishlistHeart({
  productId,
  productName = "Item",
  size = "sm",
  showRemoveUndo = false,
  className = "",
  density = "default",
}: Props) {
  const { toggle, has } = useWishlist();
  const wishlisted = has(productId);
  const iconSize =
    density === "compact" ? 14 : size === "sm" ? 18 : 22;
  const dim =
    density === "compact"
      ? "h-[22px] w-[22px] md:h-[26px] md:w-[26px]"
      : size === "sm"
        ? "h-8 w-8"
        : "h-[38px] w-[38px]";

  return (
    <button
      type="button"
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (showRemoveUndo && wishlisted) {
          dispatchStoreToast(`"${productName}" removed from wishlist`, {
            duration: 5000,
            actionLabel: "Undo",
            onAction: () => {
              void toggle(productId);
            },
          });
        }
        void toggle(productId);
      }}
      className={`flex ${dim} shrink-0 items-center justify-center rounded-full border-0 bg-white/95 text-[#C47A2B] shadow-[0_1px_3px_rgba(0,0,0,0.1)] backdrop-blur transition hover:bg-white ${className}`}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill={wishlisted ? "#C47A2B" : "none"}
        stroke={wishlisted ? "#C47A2B" : "#6B6560"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition duration-200"
        style={{ transform: wishlisted ? "scale(1.1)" : "scale(1)" }}
        aria-hidden
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
