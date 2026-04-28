/**
 * Persisted Assistant UI preferences (voice + reply language).
 * Stored in localStorage — same browsers profile for signed-in guests.
 */

export const ASSISTANT_PREFS_STORAGE_KEY = "prisbo-assistant-prefs:v1";

export const ASSISTANT_REPLY_LANGUAGE_OPTIONS = [
  { id: "auto", label: "Auto — match your typing" },
  { id: "en", label: "English" },
  { id: "hi", label: "Hindi (हिंदी)" },
  { id: "ta", label: "Tamil (தமிழ்)" },
  { id: "te", label: "Telugu (తెలుగు)" },
  { id: "kn", label: "Kannada (ಕನ್ನಡ)" },
  { id: "ml", label: "Malayalam (മലയാളം)" },
  { id: "mr", label: "Marathi (मराठी)" },
  { id: "bn", label: "Bengali (বাংলা)" },
  { id: "gu", label: "Gujarati (ગુજરાતી)" },
  { id: "pa", label: "Punjabi (ਪੰਜਾਬੀ)" },
] as const;

export type AssistantReplyLanguageId = (typeof ASSISTANT_REPLY_LANGUAGE_OPTIONS)[number]["id"];

const LANG_IDS = new Set<string>(
  ASSISTANT_REPLY_LANGUAGE_OPTIONS.map((o) => o.id as string),
);

export type AssistantPreferences = {
  replyLanguage: AssistantReplyLanguageId;
  /** Offer mic / browser speech-to-text in the composer. */
  speechInputEnabled: boolean;
  /** Read assistant replies aloud (browser speech synthesis). */
  speechOutputEnabled: boolean;
};

/** Default storefront assistant preferences — used before localStorage hydrate. */
export const DEFAULT_ASSISTANT_PREFERENCES: AssistantPreferences = {
  replyLanguage: "auto",
  speechInputEnabled: false,
  speechOutputEnabled: true,
};

const DEFAULT_PREFS = DEFAULT_ASSISTANT_PREFERENCES;

function clampPrefs(partial: Partial<AssistantPreferences>): AssistantPreferences {
  const rl = partial.replyLanguage && LANG_IDS.has(partial.replyLanguage)
    ? partial.replyLanguage
    : DEFAULT_PREFS.replyLanguage;
  return {
    replyLanguage: rl as AssistantReplyLanguageId,
    speechInputEnabled: typeof partial.speechInputEnabled === "boolean"
      ? partial.speechInputEnabled
      : DEFAULT_PREFS.speechInputEnabled,
    speechOutputEnabled: typeof partial.speechOutputEnabled === "boolean"
      ? partial.speechOutputEnabled
      : DEFAULT_PREFS.speechOutputEnabled,
  };
}

/** BCP‑47 hints for SpeechRecognition — India locales where sensible. */
const STT_BCP47: Partial<Record<AssistantReplyLanguageId, string>> = {
  auto: "",
  en: "en-IN",
  hi: "hi-IN",
  ta: "ta-IN",
  te: "te-IN",
  kn: "kn-IN",
  ml: "ml-IN",
  mr: "mr-IN",
  bn: "bn-IN",
  gu: "gu-IN",
  pa: "pa-IN",
};

/** BCP‑47 for SpeechSynthesis (same locale map). */
const TTS_BCP47 = STT_BCP47;

export function speechRecognitionLang(pref: AssistantReplyLanguageId): string {
  const x = pref === "auto" ? null : STT_BCP47[pref];
  if (x) return x;
  if (typeof navigator !== "undefined" && navigator.language?.trim()) return navigator.language.trim();
  return "en-IN";
}

export function speechSynthesisLang(pref: AssistantReplyLanguageId): string {
  const x = pref === "auto" ? null : TTS_BCP47[pref];
  if (x) return x;
  if (typeof navigator !== "undefined" && navigator.language?.trim()) return navigator.language.trim();
  return "en-IN";
}

export function parseAssistantPreferences(raw: unknown): AssistantPreferences {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PREFS };
  const o = raw as Record<string, unknown>;
  return clampPrefs({
    replyLanguage: typeof o.replyLanguage === "string" ? (o.replyLanguage as AssistantReplyLanguageId) : undefined,
    speechInputEnabled:
      typeof o.speechInputEnabled === "boolean" ? o.speechInputEnabled : undefined,
    speechOutputEnabled:
      typeof o.speechOutputEnabled === "boolean" ? o.speechOutputEnabled : undefined,
  });
}

export function readAssistantPreferences(): AssistantPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  try {
    const raw = window.localStorage.getItem(ASSISTANT_PREFS_STORAGE_KEY);
    if (!raw?.trim()) return { ...DEFAULT_PREFS };
    return parseAssistantPreferences(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function writeAssistantPreferences(next: Partial<AssistantPreferences>): AssistantPreferences {
  const merged = clampPrefs({ ...readAssistantPreferences(), ...next });
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(ASSISTANT_PREFS_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      /* ignore quota */
    }
  }
  return merged;
}
