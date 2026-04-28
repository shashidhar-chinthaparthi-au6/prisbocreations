import { getSarvamApiKey, getSarvamModel, SARVAM_CHAT_COMPLETIONS_URL } from "@/lib/sarvam/env";

export type SarvamChatRole = "system" | "user" | "assistant";

export type SarvamChatMessage = {
  role: SarvamChatRole;
  content: string;
};

type SarvamCompletionResponse = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
};

export async function sarvamChatCompletion(input: {
  messages: SarvamChatMessage[];
  temperature?: number;
}): Promise<{ content: string } | { error: string }> {
  const key = getSarvamApiKey();
  if (!key) {
    return { error: "Assistant is not configured (missing SARVAM_API_KEY)." };
  }

  const model = getSarvamModel();
  const res = await fetch(SARVAM_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: input.messages,
      temperature: input.temperature ?? 0.35,
    }),
  });

  const json = (await res.json()) as SarvamCompletionResponse;
  if (!res.ok) {
    const msg = json?.error?.message ?? res.statusText ?? "Sarvam request failed";
    return { error: msg };
  }

  const content = json?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return { error: "Empty response from assistant." };
  }
  return { content };
}
