/**
 * Sarvam AI integration — chat completion for the storefront assistant.
 * Keep all Sarvam-specific logic in this folder.
 */

export { getSarvamApiKey, getSarvamModel, SARVAM_CHAT_COMPLETIONS_URL } from "@/lib/sarvam/env";
export { sarvamChatCompletion, type SarvamChatMessage } from "@/lib/sarvam/chat-completion";
export { parseStorefrontAssistantJson } from "@/lib/sarvam/parse-assistant-json";
export {
  storefrontAssistantAnswerSchema,
  type StorefrontAssistantAnswer,
  type RawAssistantFilters,
} from "@/lib/sarvam/assistant-schema";
export { buildStorefrontAssistantSystemPrompt } from "@/lib/sarvam/assistant-system-prompt";
