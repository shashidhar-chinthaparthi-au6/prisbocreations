"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  onChange: (pin: string) => void;
  onResolved: (city: string, state: string) => void;
  disabled?: boolean;
};

/** PIN lookup — same endpoint as checkout (`/api/pincode?code=`). */
export function PincodeField({ value, onChange, onResolved, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const lastLookup = useRef("");

  useEffect(() => {
    const pin = value.replace(/\D/g, "").slice(0, 6);
    if (pin.length !== 6) {
      lastLookup.current = "";
      return;
    }
    if (pin === lastLookup.current) return;
    lastLookup.current = pin;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const r = await fetch(`/api/pincode?code=${encodeURIComponent(pin)}`);
        const j = (await r.json()) as {
          ok?: boolean;
          data?: { city?: string; state?: string; valid?: boolean };
        };
        if (cancelled || !j.ok || !j.data?.valid) return;
        const city = (j.data.city ?? "").trim();
        const state = (j.data.state ?? "").trim();
        if (city && state) onResolved(city, state);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value, onResolved]);

  return (
    <div>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={6}
        disabled={disabled}
        placeholder="560001"
        className="mt-1.5 w-full rounded-xl border border-[var(--brand-border)] px-3 py-2.5"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      />
      {loading ? <p className="mt-1 text-xs text-[var(--brand-muted)]">Looking up PIN…</p> : null}
    </div>
  );
}
