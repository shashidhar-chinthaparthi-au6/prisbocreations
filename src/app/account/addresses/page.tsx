"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api/fetch-client";
import type { MeUserDto } from "@/lib/user-me-dto";

export default function AccountAddressesPage() {
  const [user, setUser] = useState<MeUserDto | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<{ user: MeUserDto }>("/api/v1/auth/me");
        setUser(data.user);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Sign in required");
      }
    })();
  }, []);

  if (err) {
    return (
      <p className="text-[var(--brand-error)]">
        {err}.{" "}
        <Link href="/login" className="underline">
          Login
        </Link>
      </p>
    );
  }
  if (!user) return <p className="text-[var(--brand-muted)]">Loading…</p>;

  const addrs = user.addresses ?? [];

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-[var(--brand-ink)]">Saved addresses</h1>
      {addrs.length === 0 ? (
        <p className="text-[var(--brand-muted)]">
          No saved addresses yet. They will appear here when you add them at checkout or in your profile.
        </p>
      ) : (
        <ul className="space-y-4">
          {addrs.map((a, i) => (
            <li
              key={`${a.postalCode}-${i}`}
              className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-card)] p-4 text-sm text-[var(--brand-muted)]"
            >
              <p className="font-semibold text-[var(--brand-ink)]">{a.fullName}</p>
              <p>{a.line1}</p>
              {a.line2 ? <p>{a.line2}</p> : null}
              <p>
                {a.city}, {a.state} {a.postalCode}
              </p>
              <p>{a.country}</p>
              <p className="mt-2">Phone: {a.phone}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
