"use client";

import Link from "next/link";

export function EmailExistsNote({ signInHref }: { signInHref: string }) {
  return (
    <p className="mt-1.5 text-xs leading-relaxed text-amber-900">
      An account with this email already exists.{" "}
      <Link href={signInHref} className="font-semibold text-[#C47A2B] underline">
        Sign in →
      </Link>
    </p>
  );
}
