export class AdminApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

export async function adminFetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const json = (await res.json()) as { ok?: boolean; data?: T; error?: string };
  if (!res.ok || json.ok === false) {
    throw new AdminApiError(json.error ?? res.statusText, res.status);
  }
  return json.data as T;
}
