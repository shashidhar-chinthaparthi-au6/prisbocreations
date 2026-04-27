import type { NextRequest } from "next/server";

const SESSION_PREFIXES = ["authjs.session-token", "__Secure-authjs.session-token"] as const;

/**
 * Reconstruct the session JWT string from Auth.js cookie(s), including chunked cookies.
 */
export function getSessionJwtFromNextRequest(req: NextRequest): string | null {
  const all = req.cookies.getAll();
  const chunks: Record<string, string> = {};
  for (const c of all) {
    const matchesPrefix = SESSION_PREFIXES.some(
      (p) => c.name === p || c.name.startsWith(`${p}.`),
    );
    if (matchesPrefix && c.value) {
      chunks[c.name] = c.value;
    }
  }
  const sortedKeys = Object.keys(chunks).sort((a, b) => {
    const sa = parseInt(a.split(".").pop() || "0", 10);
    const sb = parseInt(b.split(".").pop() || "0", 10);
    return sa - sb;
  });
  if (sortedKeys.length === 0) return null;
  return sortedKeys.map((k) => chunks[k]).join("");
}
