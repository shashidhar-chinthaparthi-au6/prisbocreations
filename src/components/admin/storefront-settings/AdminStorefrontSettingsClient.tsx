"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/fetch-client";
import { useAdminToast } from "@/components/admin/layout/AdminShell";

type State = { assistantEnabled: boolean };

export function AdminStorefrontSettingsClient() {
  const toast = useAdminToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<State | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await apiFetch<State>("/api/v1/admin/storefront-settings");
      setState(d);
    } catch (e) {
      toast({ type: "error", message: e instanceof Error ? e.message : "Failed to load settings" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (next: boolean) => {
    if (saving || !state) return;
    setSaving(true);
    try {
      const d = await apiFetch<State>("/api/v1/admin/storefront-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assistantEnabled: next }),
      });
      setState(d);
      toast({ type: "success", message: next ? "Prisbo Assistant is now visible on the shop." : "Prisbo Assistant is hidden from the shop." });
    } catch (e) {
      toast({ type: "error", message: e instanceof Error ? e.message : "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl font-semibold text-zinc-900">Storefront</h1>
      <p className="mt-1 text-sm text-zinc-600">Control which optional storefront features shoppers see.</p>

      <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Prisbo Assistant</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Chat-based gift and catalogue help (header button, slide-over panel, and full page). When off, entry points and API are disabled.
            </p>
          </div>
          {loading || !state ?
            <div className="h-7 w-12 shrink-0 animate-pulse rounded-full bg-zinc-200" aria-hidden />
          : <button
              type="button"
              role="switch"
              aria-checked={state.assistantEnabled}
              disabled={saving}
              onClick={() => void toggle(!state.assistantEnabled)}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 ${
                state.assistantEnabled ? "bg-emerald-600" : "bg-zinc-300"
              } ${saving ? "opacity-60" : ""}`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow transition ${
                  state.assistantEnabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          }
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          Enabled: shoppers see Assistant in navigation. Disabled: assistants API returns unavailable; direct links redirect home.
        </p>
      </div>
    </div>
  );
}
