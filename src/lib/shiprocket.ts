/**
 * Shiprocket External API — auth + fetch.
 * Env: SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD, SHIPROCKET_BEARER_TOKEN (optional),
 * SHIPROCKET_DEFAULT_WEIGHT_KG, SHIPROCKET_DEFAULT_LENGTH_CM, etc.
 */

const BASE = "https://apiv2.shiprocket.in/v1/external";

interface TokenCache {
  token: string;
  expiry: Date;
}

let _cache: TokenCache | null = null;

async function loginFresh(): Promise<string> {
  const email = process.env.SHIPROCKET_EMAIL?.trim();
  const password = process.env.SHIPROCKET_PASSWORD?.trim();
  if (!email || !password) {
    throw new Error("Shiprocket: set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD (or SHIPROCKET_BEARER_TOKEN)");
  }
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`Shiprocket login non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  if (!res.ok) {
    throw new Error(`Shiprocket login ${res.status}: ${text.slice(0, 400)}`);
  }
  const token = data.token as string | undefined;
  if (!token) throw new Error(`Shiprocket login failed: ${JSON.stringify(data)}`);
  _cache = {
    token,
    expiry: new Date(Date.now() + 23 * 60 * 60 * 1000),
  };
  return token;
}

/**
 * @param skipStatic — omit SHIPROCKET_BEARER_TOKEN (used after 401 so we fall back to email/password)
 */
async function resolveToken(opts?: { skipStatic?: boolean }): Promise<string> {
  if (!opts?.skipStatic) {
    const staticToken = process.env.SHIPROCKET_BEARER_TOKEN?.trim();
    if (staticToken) return staticToken;
  }
  if (_cache && new Date() < _cache.expiry) return _cache.token;
  return loginFresh();
}

/**
 * Low-level JSON API call. On 401, clears cache and retries once without static bearer.
 */
export async function shiprocketFetch(
  endpoint: string,
  options: RequestInit = {},
  _retry = false,
): Promise<unknown> {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${BASE}${path}`;
  const token = await resolveToken(_retry ? { skipStatic: true } : undefined);
  const method = (options.method ?? "GET").toUpperCase();
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(method !== "GET" && method !== "HEAD" ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string> | undefined),
    },
  });

  if (res.status === 401 && !_retry) {
    _cache = null;
    return shiprocketFetch(endpoint, options, true);
  }

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Shiprocket non-JSON response: ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    const msg = typeof parsed === "object" && parsed && "message" in parsed ? String((parsed as { message: unknown }).message) : text.slice(0, 300);
    throw new Error(`Shiprocket ${res.status}: ${msg}`);
  }
  return parsed;
}

export function getDefaultDimensions() {
  const n = (v: string | undefined, d: number) => {
    const x = Number(v);
    return Number.isFinite(x) && x > 0 ? x : d;
  };
  return {
    weight: n(process.env.SHIPROCKET_DEFAULT_WEIGHT_KG, 0.5),
    length: n(process.env.SHIPROCKET_DEFAULT_LENGTH_CM, 20),
    breadth: n(process.env.SHIPROCKET_DEFAULT_BREADTH_CM, 15),
    height: n(process.env.SHIPROCKET_DEFAULT_HEIGHT_CM, 5),
  };
}

export function calcWeight(items: { quantity: number; weightKg?: number }[]): number {
  const defaultWeight = Number(process.env.SHIPROCKET_DEFAULT_WEIGHT_KG ?? 0.5);
  const total = items.reduce((sum, item) => {
    return sum + (item.weightKg ?? defaultWeight) * item.quantity;
  }, 0);
  return Math.max(0.1, Math.round(total * 100) / 100);
}
