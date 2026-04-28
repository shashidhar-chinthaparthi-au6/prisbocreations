import { connectDb } from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/api/response";
import { listNavCategoryTree } from "@/lib/services/catalogService";
import {
  buildStorefrontAssistantSystemPrompt,
  parseStorefrontAssistantJson,
  sarvamChatCompletion,
  type SarvamChatMessage,
} from "@/lib/sarvam";
import {
  buildAssistantListingHref,
  validateAssistantFiltersAgainstCatalog,
} from "@/lib/storefront-assistant-filters";
import {
  buildAssistantFilterSummaryLabel,
  refineAssistantFiltersFromUserMessage,
} from "@/lib/storefront/assistant-filter-refinement";

const MAX_HISTORY = 16;
const MAX_CONTENT = 1800;

type Body = {
  messages?: { role: string; content: string }[];
  pathname?: string;
};

function sanitizeMessages(raw: Body["messages"]): SarvamChatMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: SarvamChatMessage[] = [];
  for (const m of raw.slice(-MAX_HISTORY)) {
    if (!m || typeof m !== "object") continue;
    const role = m.role;
    const content = typeof m.content === "string" ? m.content.trim() : "";
    if (!content || content.length > MAX_CONTENT) continue;
    if (role === "user" || role === "assistant") {
      out.push({ role, content: content.slice(0, MAX_CONTENT) });
    }
  }
  if (out.length === 0) return null;
  return out;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const history = sanitizeMessages(body.messages);
  if (!history) {
    return jsonError("Provide a non-empty messages array with user/assistant roles.", 400);
  }

  await connectDb();
  const tree = await listNavCategoryTree();
  const system: SarvamChatMessage = {
    role: "system",
    content: buildStorefrontAssistantSystemPrompt(tree),
  };

  const completion = await sarvamChatCompletion({
    messages: [system, ...history],
    temperature: 0.35,
  });

  if ("error" in completion) {
    return jsonError(completion.error, 502);
  }

  const parsed = parseStorefrontAssistantJson(completion.content);
  if (!parsed.ok) {
    return jsonError(parsed.error, 502);
  }

  const lastUserText =
    [...history].reverse().find((m) => m.role === "user")?.content.trim() ?? "";

  let validated = validateAssistantFiltersAgainstCatalog(parsed.data.filters, tree);
  validated = refineAssistantFiltersFromUserMessage(tree, validated, lastUserText);
  const filterSummary = buildAssistantFilterSummaryLabel(tree, validated);
  const applyHref = buildAssistantListingHref(body.pathname, validated);

  return jsonOk({
    reply: parsed.data.reply,
    applyHref: applyHref ?? null,
    filterSummary: filterSummary ?? null,
  });
}
