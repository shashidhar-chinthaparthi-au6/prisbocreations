export type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: string };

function redirectAdminSessionExpired(): void {
  if (typeof window === "undefined") return;
  const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
  window.location.assign(`/login?reason=session_expired&next=${next}`);
}

function shouldHandleAdmin401(path: string, status: number): boolean {
  return status === 401 && path.startsWith("/api/v1/admin");
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body !== undefined && init?.body !== null;
  const headers = new Headers(init?.headers);
  if (hasBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers,
  });

  if (shouldHandleAdmin401(path, res.status)) {
    redirectAdminSessionExpired();
    throw new Error("Your session ended. Please sign in again.");
  }

  let json: ApiEnvelope<T> & Record<string, unknown>;
  try {
    json = (await res.json()) as ApiEnvelope<T> & Record<string, unknown>;
  } catch {
    throw new Error(`Request failed (${res.status})`);
  }

  if (!res.ok || !json || typeof json !== "object" || !("ok" in json) || !json.ok) {
    let msg =
      typeof json === "object" && json && "error" in json && typeof json.error === "string"
        ? json.error
        : `Request failed (${res.status})`;
    const issues = typeof json === "object" && json && "issues" in json ? json.issues : undefined;
    if (issues && typeof issues === "object" && issues !== null && "fieldErrors" in issues) {
      const fe = (issues as { fieldErrors?: Record<string, string[]> }).fieldErrors;
      if (fe && typeof fe === "object") {
        const detail = Object.entries(fe)
          .filter(([, v]) => Array.isArray(v) && v.length)
          .map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`)
          .join("; ");
        if (detail) msg = `${msg} (${detail})`;
      }
    }
    throw new Error(msg);
  }
  return (json as { data: T }).data;
}
