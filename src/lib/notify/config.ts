/** Public site URL for links in emails (order, reset password). */
export function appBaseUrl(): string {
  const u = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (u) return u.replace(/\/$/, "");
  return "http://localhost:3000";
}

export function isSesConfigured(): boolean {
  return Boolean(process.env.AWS_REGION?.trim() && process.env.SES_FROM_EMAIL?.trim());
}

/** Msg91 Flow API: set MSG91_AUTHKEY + per-event template IDs to enable SMS. */
export function isMsg91Configured(): boolean {
  return Boolean(process.env.MSG91_AUTHKEY?.trim());
}
