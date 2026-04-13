"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export const SITE_MAIN_SCROLL_ID = "site-main-scroll";

export function ScrollToTopButton() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const footer = document.querySelector("[data-site-footer]");
    let cleanupFooter: (() => void) | undefined;

    if (footer) {
      const syncFooterHeight = () => {
        const h = Math.ceil(footer.getBoundingClientRect().height);
        root.style.setProperty("--site-footer-height", `${h}px`);
      };
      syncFooterHeight();
      const ro = new ResizeObserver(syncFooterHeight);
      ro.observe(footer);
      window.addEventListener("resize", syncFooterHeight);
      cleanupFooter = () => {
        ro.disconnect();
        window.removeEventListener("resize", syncFooterHeight);
        root.style.removeProperty("--site-footer-height");
      };
    }

    const main = document.getElementById(SITE_MAIN_SCROLL_ID);
    if (!main) {
      return cleanupFooter;
    }

    const update = () => {
      setShow(main.scrollTop > 320);
    };

    update();
    main.addEventListener("scroll", update, { passive: true });
    return () => {
      main.removeEventListener("scroll", update);
      cleanupFooter?.();
    };
  }, [pathname]);

  const goTop = useCallback(() => {
    const main = document.getElementById(SITE_MAIN_SCROLL_ID);
    if (!main) return;
    main.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      onClick={goTop}
      className="fixed right-[max(1rem,env(safe-area-inset-right))] z-50 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white shadow-lg ring-2 ring-white/30 transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:right-6"
      style={{
        bottom:
          "max(1rem, calc(env(safe-area-inset-bottom, 0px) + var(--site-footer-height, 10rem) + 0.75rem))",
      }}
      aria-label="Back to top"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        className="h-6 w-6"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
      </svg>
    </button>
  );
}
