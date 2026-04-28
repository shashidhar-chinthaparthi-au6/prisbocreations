import type { AssistantChatRow } from "@/lib/store/assistant-chat-store";

const KEY = "prisboAssistant.messages.v1";

function isRow(x: unknown): x is AssistantChatRow {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const role = o.role;
  const content = o.content;
  if (role !== "user" && role !== "assistant") return false;
  if (typeof content !== "string") return false;
  if ("applyHref" in o && o.applyHref != null && typeof o.applyHref !== "string") return false;
  if ("filterSummary" in o && o.filterSummary != null && typeof o.filterSummary !== "string") return false;
  return true;
}

export function readGuestMessagesFromSession(): AssistantChatRow[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    if (!parsed.every(isRow)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeGuestMessagesToSession(messages: AssistantChatRow[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(messages));
  } catch {
    /* quota / private mode */
  }
}

export function clearGuestMessagesFromSession() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
