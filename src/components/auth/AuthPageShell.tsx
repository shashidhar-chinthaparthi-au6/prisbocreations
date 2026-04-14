"use client";

import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthMarketingPanel } from "@/components/auth/AuthMarketingPanel";

type Tab = "login" | "register";

type Props = {
  nextPath: string;
  /** Route this shell is rendered from — drives URL behaviour when switching tabs. */
  mode: "login" | "register";
  initialTab: Tab;
  sessionExpired?: boolean;
  passwordReset?: boolean;
  /** Hide register tab (e.g. already signed in). */
  suppressRegisterTab?: boolean;
};

/** Break out of `main` horizontal padding (matches layout: base 1rem, sm 1.5rem, lg 2rem). */
const MAIN_BLEED =
  "-mx-4 w-[calc(100%+2rem)] sm:-mx-6 sm:w-[calc(100%+3rem)] lg:-mx-8 lg:w-[calc(100%+4rem)]";

/** Pull flush under the sticky header: `main` uses `py-8` (2rem) top padding. */
const MAIN_TOP_BLEED = "-mt-8";

export function AuthPageShell({
  nextPath,
  mode,
  initialTab,
  sessionExpired,
  passwordReset,
  suppressRegisterTab,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>(initialTab);

  const syncLoginUrl = useCallback(
    (next: Tab) => {
      if (mode !== "login") return;
      const params = new URLSearchParams(searchParams.toString());
      if (next === "register") params.set("tab", "register");
      else params.delete("tab");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [mode, pathname, router, searchParams],
  );

  const selectTab = useCallback(
    (next: Tab) => {
      if (suppressRegisterTab && next === "register") return;
      if (mode === "register" && next === "login") {
        router.push("/login");
        return;
      }
      if (mode === "login" && next === "register") {
        setTab("register");
        syncLoginUrl("register");
        return;
      }
      setTab(next);
      syncLoginUrl(next);
    },
    [mode, router, suppressRegisterTab, syncLoginUrl],
  );

  return (
    <div
      className={`relative ${MAIN_BLEED} ${MAIN_TOP_BLEED} flex min-h-0 flex-col overflow-hidden rounded-none border-y border-sand-deep bg-white shadow-none md:min-h-[calc(100dvh-4.5rem)] md:flex-row md:border-x-0 md:border-y-0`}
    >
      {/* Left: marketing — takes most width (Facebook-style split) */}
      <div className="relative min-h-[16rem] md:min-h-0 md:w-[58%] md:max-w-none lg:w-[60%] xl:w-[62%]">
        <AuthMarketingPanel />
      </div>

      {/* Right: full-bleed panel — one surface (no inner card), soft gradients + texture */}
      <div className="relative flex flex-1 flex-col overflow-hidden border-t border-sand-deep/50 md:min-h-0 md:w-[42%] md:border-l md:border-t-0 lg:w-[40%] xl:w-[38%]">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#fdfcfa] via-[#f5efe6] to-[#e8dfd2]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_100%_0%,rgba(180,83,9,0.12),transparent_52%),radial-gradient(ellipse_90%_55%_at_0%_100%,rgba(159,18,55,0.07),transparent_48%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.4] mix-blend-multiply [background-image:repeating-linear-gradient(-14deg,rgba(15,23,42,0.025)_0_1px,transparent_1px_11px)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-accent/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full bg-rose/8 blur-3xl"
          aria-hidden
        />

        <div className="relative z-10 flex flex-1 flex-col justify-center px-6 py-8 sm:px-10 md:px-12 md:py-10 lg:px-16 lg:py-12">
          <div className="mx-auto w-full max-w-md -translate-y-3 md:-translate-y-6 lg:-translate-y-8">
            {!suppressRegisterTab ? (
              <div className="mb-6 flex rounded-full border border-ink/10 bg-white/50 p-1 text-sm font-medium shadow-sm backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => selectTab("login")}
                  className={`min-h-10 flex-1 rounded-full px-3 transition ${
                    tab === "login"
                      ? "bg-white text-ink shadow-sm ring-1 ring-ink/5"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => selectTab("register")}
                  className={`min-h-10 flex-1 rounded-full px-3 transition ${
                    tab === "register"
                      ? "bg-white text-ink shadow-sm ring-1 ring-ink/5"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  Create account
                </button>
              </div>
            ) : null}

            {tab === "login" ? (
              <>
                <div className="mb-6">
                  <h1 className="font-display text-2xl text-ink">Welcome back</h1>
                  <p className="mt-1 text-sm text-ink-muted">
                    Sign in to track orders and checkout faster.
                  </p>
                </div>
                {sessionExpired ? (
                  <p className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50/95 px-3 py-2 text-sm text-amber-950 backdrop-blur-sm">
                    Your session ended; please sign in again.
                  </p>
                ) : null}
                {passwordReset ? (
                  <p className="mb-4 rounded-lg border border-emerald-200/80 bg-emerald-50/95 px-3 py-2 text-sm text-emerald-900 backdrop-blur-sm">
                    Your password was updated. Sign in with your new password.
                  </p>
                ) : null}
                <LoginForm nextPath={nextPath} />
              </>
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="font-display text-2xl text-ink">Join Prisbo</h1>
                  <p className="mt-1 text-sm text-ink-muted">
                    Create an account to save addresses and see your order history in one place.
                  </p>
                </div>
                <RegisterForm nextPath={nextPath} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthPageShellFallback() {
  return (
    <div
      className={`relative ${MAIN_BLEED} ${MAIN_TOP_BLEED} flex min-h-[16rem] animate-pulse flex-col overflow-hidden bg-sand/40 md:min-h-[calc(100dvh-4.5rem)] md:flex-row`}
      aria-hidden
    >
      <div className="min-h-[14rem] bg-ink/10 md:w-[58%] lg:w-[60%]" />
      <div className="relative flex flex-1 overflow-hidden border-t border-sand-deep/40 md:border-l md:border-t-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[#fdfcfa] via-[#f5efe6] to-[#e8dfd2]" />
      </div>
    </div>
  );
}
