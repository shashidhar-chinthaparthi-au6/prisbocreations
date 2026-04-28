/** Server-only Sarvam configuration from environment. */

export function getSarvamApiKey(): string | undefined {
  const k = process.env.SARVAM_API_KEY?.trim();
  return k || undefined;
}

export function getSarvamModel(): string {
  const m = process.env.SARVAM_MODEL?.trim();
  return m || "sarvam-30b";
}

export const SARVAM_CHAT_COMPLETIONS_URL = "https://api.sarvam.ai/v1/chat/completions";
