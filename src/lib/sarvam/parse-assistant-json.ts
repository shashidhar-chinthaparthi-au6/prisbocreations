import {
  storefrontAssistantAnswerSchema,
  type StorefrontAssistantAnswer,
} from "@/lib/sarvam/assistant-schema";

/** Assistant text when the model returns filters but an empty or missing reply field. */
const MIN_REPLY_FROM_FILTERS_ONLY =
  "Here are some curated picks from our catalogue — tap below to browse matching products.";

/**
 * LLMs often emit real newlines/carriage returns inside JSON string values, which makes JSON.parse throw.
 * Escape them as \\n while respecting backslash escapes inside "…" segments.
 */
function escapeUnescapedWhitespaceInJsonStrings(s: string): string {
  let r = "";
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (!inString) {
      r += c;
      if (c === '"') {
        inString = true;
        escape = false;
      }
      continue;
    }
    if (escape) {
      r += c;
      escape = false;
      continue;
    }
    if (c === "\\") {
      r += c;
      escape = true;
      continue;
    }
    if (c === `"`) {
      inString = false;
      r += c;
      continue;
    }
    if (c === "\n") {
      r += "\\n";
      continue;
    }
    if (c === "\r") {
      if (s[i + 1] === "\n") i++;
      r += "\\n";
      continue;
    }
    /** Other control chars → space to keep parse cheap */
    const code = c.charCodeAt(0);
    if (code < 0x20 && c !== "\t") {
      r += " ";
      continue;
    }
    r += c;
  }
  return r;
}

function stripCodeFence(text: string): string {
  const t = text.trim();
  if (!t.startsWith("```")) return t;
  const lines = t.split("\n");
  if (lines.length < 2) return t;
  if (lines[0].startsWith("```")) lines.shift();
  if (lines.length && lines[lines.length - 1].trim() === "```") lines.pop();
  return lines.join("\n").trim();
}

/** Typical model mistakes before JSON.parse — keep surface-level only. */
function sanitizeJsonText(s: string): string {
  let t = s;
  /** Smart / typographic quotes that break JSON.stringify expectations */
  t = t.replace(/[\u201c\u201d\u201e\u201f]/g, '"');
  /** Trailing commas before } or ] */
  t = t.replace(/,\s*([}\]])/g, "$1");
  return t.trim();
}

/**
 * Slice the first `{ … }` balanced segment, respecting JSON double-quoted strings and escapes.
 */
function extractBalancedObject(s: string): string | null {
  const start = s.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i]!;
    if (inString) {
      if (escape) {
        escape = false;
      } else if (c === "\\") {
        escape = true;
      } else if (c === '"') {
        inString = false;
      }
    } else if (c === '"') {
      inString = true;
      escape = false;
    } else if (c === "{") {
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

const SORT_ALLOWED = new Set([
  "relevance",
  "newest",
  "price_asc",
  "price_desc",
  "popular",
  "name_asc",
]);

/** Best-effort filter object coercion so a slightly malformed nested object doesn't fail the whole assistant turn. */
function sanitizeFilters(raw: unknown): StorefrontAssistantAnswer["filters"] | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const src = raw as Record<string, unknown>;
  const o: Record<string, unknown> = {};

  if (typeof src.q === "string") o.q = src.q;
  if (Array.isArray(src.categories))
    o.categories = src.categories.filter((x) => typeof x === "string").slice(0, 12);
  if (typeof src.category === "string") o.category = src.category;
  if (Array.isArray(src.subcategories)) {
    const subs = src.subcategories
      .filter((x) => x && typeof x === "object" && !Array.isArray(x))
      .map((x) => {
        const row = x as Record<string, unknown>;
        return {
          slug: typeof row.slug === "string" ? row.slug : "",
          category: typeof row.category === "string" ? row.category : undefined,
        };
      })
      .filter((r) => r.slug.trim().length > 0)
      .slice(0, 12);
    if (subs.length) o.subcategories = subs;
  }
  if (typeof src.subcategory === "string") o.subcategory = src.subcategory;
  if (typeof src.recipient === "string") o.recipient = src.recipient;
  if (typeof src.sort === "string" && SORT_ALLOWED.has(src.sort)) o.sort = src.sort;

  const num = (v: unknown) => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    }
    return NaN;
  };
  const pmin = num(src.price_min);
  if (Number.isFinite(pmin) && pmin >= 0) o.price_min = pmin;
  const pmax = num(src.price_max);
  if (Number.isFinite(pmax) && pmax >= 0) o.price_max = pmax;

  if (typeof src.in_stock === "boolean") o.in_stock = src.in_stock;
  if (typeof src.occasion === "string") o.occasion = src.occasion;
  if (typeof src.material === "string") o.material = src.material;
  if (src.rating === "4" || src.rating === "4+" || src.rating === 4) o.rating = "4";

  const fb = storefrontAssistantAnswerSchema.pick({ filters: true }).safeParse({
    filters: Object.keys(o).length ? o : null,
  });
  if (!fb.success) return null;
  return fb.data.filters ?? null;
}

function coerceAnswerFromUnknown(parsed: unknown): { ok: true; data: StorefrontAssistantAnswer } | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const o = parsed as Record<string, unknown>;
  const replyRaw = o.reply;

  /** Full strict schema first */
  const strict = storefrontAssistantAnswerSchema.safeParse(parsed);
  if (strict.success) return { ok: true, data: strict.data };

  let replyFallback =
    typeof replyRaw === "string" ?
      replyRaw.trim().slice(0, 32000)
    : typeof replyRaw === "number" && Number.isFinite(replyRaw) ?
      String(replyRaw)
    : "";

  if (!replyFallback.length && o.filters != null && typeof o.filters === "object" && !Array.isArray(o.filters)) {
    replyFallback = MIN_REPLY_FROM_FILTERS_ONLY;
  }

  if (!replyFallback.length) return null;

  const filtersSanitized = sanitizeFilters(o.filters);

  const merged = storefrontAssistantAnswerSchema.safeParse({
    reply: replyFallback,
    filters: filtersSanitized,
  });

  if (merged.success) return { ok: true, data: merged.data };

  const replyOnly = storefrontAssistantAnswerSchema.safeParse({ reply: replyFallback, filters: null });
  if (replyOnly.success) return { ok: true, data: replyOnly.data };

  return null;
}

/**
 * Very last resort: scrape a reply string from butchered JSON-ish output so shoppers never dead-end.
 */
function extractReplyRough(text: string): string | null {
  const trimmed = text.trim();
  /** Try first JSON-like "reply" : "..."" */
  const re =
    /"reply"\s*:\s*"([\s\S]*?)"(?:\s*[,}]|\s*$)/m.exec(trimmed) ??
    /"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(trimmed);
  if (re?.[1]?.trim()) {
    return roughUnescapeJsonString(re[1].trim().slice(0, 32000));
  }
  /** Model sometimes emits single-quoted reply */
  const reSq = /'reply'\s*:\s*'((?:[^'\\]|\\.)*)'/.exec(trimmed);
  if (reSq?.[1]?.trim()) return reSq[1].trim().slice(0, 32000);
  return null;
}

function roughUnescapeJsonString(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function tryParseJson(s: string): { ok: true; data: StorefrontAssistantAnswer } | null {
  const cleaned = stripCodeFence(s.trim());
  const attempts: string[] = [];

  attempts.push(cleanJsonAttempt(cleaned));
  const balanced = extractBalancedObject(cleaned);
  if (balanced && balanced !== cleaned) attempts.push(cleanJsonAttempt(balanced));

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end > start) {
    const slice = cleaned.slice(start, end + 1);
    if (!attempts.includes(slice)) attempts.push(cleanJsonAttempt(slice));
  }

  const seen = new Set<string>();
  for (const body of attempts) {
    if (!body || seen.has(body)) continue;
    seen.add(body);
    try {
      const raw = JSON.parse(body) as unknown;
      const coerced = coerceAnswerFromUnknown(raw);
      if (coerced) return coerced;
    } catch {
      /* next */
    }
  }
  return null;
}

function cleanJsonAttempt(s: string): string {
  let t = sanitizeJsonText(s);
  t = escapeUnescapedWhitespaceInJsonStrings(t);
  /** Second pass trailing comma lines */
  t = t.replace(/,\s*([}\]])/g, "$1");
  return t;
}

/**
 * Parses model output into structured assistant reply + optional storefront filters.
 * Tolerates common LLM JSON mistakes; falls back to reply-only when filters are unusable.
 */
export function parseStorefrontAssistantJson(text: string) {
  const result = tryParseJson(text);
  if (result) return result;

  const scraped = extractReplyRough(text);
  if (scraped?.trim().length) {
    const scrapedOnly = storefrontAssistantAnswerSchema.safeParse({ reply: scraped.trim(), filters: null });
    if (scrapedOnly.success) return { ok: true as const, data: scrapedOnly.data };
  }

  return {
    ok: false as const,
    error: "Assistant response had invalid JSON.",
  };
}
