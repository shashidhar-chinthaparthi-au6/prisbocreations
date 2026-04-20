/**
 * Cloudflare Turnstile server-side verification.
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export async function verifyTurnstileToken(token: string | undefined, remoteIp: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[turnstile] TURNSTILE_SECRET_KEY unset — skipping verification in development");
      return true;
    }
    return false;
  }
  if (!token?.trim()) return false;

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token.trim());
  if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
  if (!data.success) {
    console.warn("[turnstile] verify failed", data["error-codes"]);
  }
  return data.success === true;
}
