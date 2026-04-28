import { Types } from "mongoose";
import { connectDb } from "@/lib/db";
import { getOptionalAuth } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { storefrontAssistantUnavailableResponse } from "@/lib/services/storefrontSettingsService";
import {
  AssistantConversation,
  isAssistantThreadStale,
} from "@/lib/models/AssistantConversation";
import type { AssistantChatRow } from "@/lib/store/assistant-chat-store";

const INTRO_CONTENT =
  "Hi — I'm Prisbo Assistant. Tell me who you're gifting, the occasion, or what kind of product you have in mind, and I'll help narrow the catalogue.";

function introOnly(): AssistantChatRow[] {
  return [{ role: "assistant", content: INTRO_CONTENT }];
}

function stripForClient(
  rows: Array<{
    role?: string;
    content?: unknown;
    applyHref?: string | null;
    filterSummary?: string | null;
  }>,
): AssistantChatRow[] {
  const out: AssistantChatRow[] = [];
  for (const r of rows) {
    if (!r || (r.role !== "user" && r.role !== "assistant")) continue;
    const content = typeof r.content === "string" ? r.content : "";
    if (!content) continue;
    let filterSummary: string | null = null;
    if (typeof r.filterSummary === "string" && r.filterSummary.length > 0) {
      filterSummary = r.filterSummary.slice(0, 500);
    }
    out.push({
      role: r.role,
      content,
      applyHref:
        typeof r.applyHref === "string" && r.applyHref.length > 0 ? r.applyHref : null,
      filterSummary,
    });
  }
  return out.length ? out : introOnly();
}

/** GET transcript for signed-in user; drops idle thread past ~10 days since last save. */
export async function GET() {
  const denied = await storefrontAssistantUnavailableResponse();
  if (denied) return denied;

  const session = await getOptionalAuth();
  if (!session?.sub || !Types.ObjectId.isValid(session.sub)) {
    return jsonOk({ messages: [], persistent: false, retentionDays: 10 });
  }

  await connectDb();
  const uid = new Types.ObjectId(session.sub);
  const doc = await AssistantConversation.findOne({ userId: uid }).lean();

  if (!doc?.messages?.length) {
    return jsonOk({
      messages: introOnly(),
      persistent: false,
      retentionDays: 10,
    });
  }

  const updated =
    doc.updatedAt instanceof Date ? doc.updatedAt : new Date(doc.updatedAt ?? Date.now());
  if (isAssistantThreadStale(updated)) {
    await AssistantConversation.deleteOne({ userId: uid });
    return jsonOk({
      messages: introOnly(),
      persistent: false,
      retentionDays: 10,
      expired: true,
    });
  }

  const messages = stripForClient(doc.messages as Parameters<typeof stripForClient>[0]);
  return jsonOk({
    messages,
    persistent: true,
    retentionDays: 10,
  });
}

type PutBody = { messages?: unknown };

/** PUT replace transcript; Mongoose timestamps refresh retention window. */
export async function PUT(req: Request) {
  const denied = await storefrontAssistantUnavailableResponse();
  if (denied) return denied;

  const session = await getOptionalAuth();
  if (!session?.sub || !Types.ObjectId.isValid(session.sub)) {
    return jsonError("Sign in to save assistant conversations.", 401);
  }

  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const raw = body.messages;
  if (!Array.isArray(raw)) {
    return jsonError("Provide messages array.", 400);
  }

  const rows: Array<{
    role: "user" | "assistant";
    content: string;
    applyHref: string | null;
    filterSummary?: string | null;
  }> = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const role = e.role;
    const content =
      typeof e.content === "string" ? e.content.trim().slice(0, 32000) : "";
    if (!content || (role !== "user" && role !== "assistant")) continue;
    let applyHref: string | null = null;
    if (typeof e.applyHref === "string" && e.applyHref.length > 0) {
      applyHref = e.applyHref.slice(0, 4096);
    }
    let filterSummary: string | null = null;
    if (typeof e.filterSummary === "string" && e.filterSummary.trim().length) {
      filterSummary = e.filterSummary.trim().slice(0, 500);
    }
    rows.push({ role: role as "user" | "assistant", content, applyHref, filterSummary });
  }

  if (rows.length === 0) {
    return jsonError("Nothing to save.", 400);
  }

  await connectDb();
  const userId = new Types.ObjectId(session.sub);
  await AssistantConversation.findOneAndUpdate(
    { userId },
    { userId, messages: rows },
    { upsert: true },
  );

  return jsonOk({ saved: true });
}

/** DELETE saved transcript only. */
export async function DELETE() {
  const denied = await storefrontAssistantUnavailableResponse();
  if (denied) return denied;

  const session = await getOptionalAuth();
  if (!session?.sub || !Types.ObjectId.isValid(session.sub)) {
    return jsonError("Sign in to clear saved history.", 401);
  }

  await connectDb();
  await AssistantConversation.deleteOne({ userId: new Types.ObjectId(session.sub) });
  return jsonOk({ cleared: true });
}
