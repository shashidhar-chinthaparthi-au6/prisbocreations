"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

export function TrackTurnstile({
  onToken,
  onClear,
}: {
  onToken: (token: string) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  const onTokenRef = useRef(onToken);
  const onClearRef = useRef(onClear);
  onTokenRef.current = onToken;
  onClearRef.current = onClear;

  useEffect(() => {
    if (!SITE_KEY || !ready || !ref.current || !window.turnstile) return;
    onClearRef.current();
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        /* ignore */
      }
      widgetIdRef.current = null;
    }
    widgetIdRef.current = window.turnstile.render(ref.current, {
      sitekey: SITE_KEY,
      callback: (t) => onTokenRef.current(t),
      "error-callback": () => onClearRef.current(),
      "expired-callback": () => onClearRef.current(),
    });
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = null;
      }
    };
  }, [ready]);

  if (!SITE_KEY) {
    return (
      <p className="text-xs text-amber-900">
        Security check is not configured (missing NEXT_PUBLIC_TURNSTILE_SITE_KEY). In production, set Turnstile keys.
      </p>
    );
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
        onLoad={() => setReady(true)}
      />
      <div ref={ref} className="min-h-[65px]" />
    </>
  );
}
