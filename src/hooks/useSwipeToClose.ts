"use client";

import { useRef } from "react";

type Direction = "down" | "left";

/**
 * Touch swipe to dismiss: vertical down (sheets) or horizontal left (side drawer).
 */
export function useSwipeToClose(onClose: () => void, direction: Direction = "down", threshold = 80) {
  const startX = useRef(0);
  const startY = useRef(0);

  return {
    onTouchStart: (e: React.TouchEvent) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const t = e.changedTouches[0];
      if (!t) return;
      if (direction === "down") {
        const delta = t.clientY - startY.current;
        if (delta > threshold) onClose();
      } else {
        const delta = t.clientX - startX.current;
        if (delta < -threshold) onClose();
      }
    },
  };
}
