export type ApiEnvelope<T> = { ok: true; data: T } | { ok: false; error: string };

/** Admin-only multipart upload (images + MP4/WebM/MOV); returns a public path like `/uploads/…`. */
export async function uploadAdminImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/v1/admin/upload", {
    method: "POST",
    body: fd,
    credentials: "include",
  });
  const json = (await res.json()) as ApiEnvelope<{ url: string }> & Record<string, unknown>;
  if (!res.ok || !json || typeof json !== "object" || !("ok" in json) || !json.ok) {
    const msg =
      typeof json === "object" && json && "error" in json && typeof json.error === "string"
        ? json.error
        : `Upload failed (${res.status})`;
    throw new Error(msg);
  }
  return (json as { data: { url: string } }).data.url;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  const json = (await res.json()) as ApiEnvelope<T> & Record<string, unknown>;
  if (!res.ok || !json || typeof json !== "object" || !("ok" in json) || !json.ok) {
    const msg =
      typeof json === "object" && json && "error" in json && typeof json.error === "string"
        ? json.error
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return (json as { data: T }).data;
}
