import { validateClientCustomization } from "@/lib/customization-client-validate";
import { isTrustedCustomizationAssetUrl } from "@/lib/customization-trust-url";
import type {
  CustomizationFieldDef,
  CustomizationDataMap,
  CustomizationFilesMap,
  CustomizationFileMeta,
} from "@/lib/customization-types";

export type LineCustomizationPayload = {
  customerImageUrl?: string;
  customerNotes?: string;
  customizationData?: CustomizationDataMap;
  customizationFiles?: unknown;
};

export function parseProductCustomizationFields(raw: unknown): CustomizationFieldDef[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomizationFieldDef[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object" || Array.isArray(x)) continue;
    const o = x as Record<string, unknown>;
    const key = typeof o.key === "string" ? o.key.trim() : "";
    const type = typeof o.type === "string" ? o.type.trim() : "";
    const label = typeof o.label === "string" ? o.label.trim() : "";
    if (!key || !type || !label) continue;
    if (
      type !== "image" &&
      type !== "text" &&
      type !== "textarea" &&
      type !== "url" &&
      type !== "select" &&
      type !== "boolean"
    ) {
      continue;
    }
    const def: CustomizationFieldDef = {
      key,
      type,
      label,
      required: Boolean(o.required),
    };
    if (typeof o.hint === "string" && o.hint.trim()) def.hint = o.hint.trim();
    if (typeof o.maxChars === "number" && Number.isFinite(o.maxChars) && o.maxChars > 0) {
      def.maxChars = Math.floor(o.maxChars);
    }
    if (Array.isArray(o.options)) {
      const opts = o.options.filter(
        (s): s is string => typeof s === "string" && s.trim().length > 0,
      );
      if (opts.length) def.options = opts;
    }
    if (o.multiple === true) def.multiple = true;
    if (typeof o.maxFiles === "number" && Number.isFinite(o.maxFiles) && o.maxFiles > 0) {
      def.maxFiles = Math.floor(o.maxFiles);
    }
    out.push(def);
  }
  return out;
}

function normalizeFileMeta(raw: unknown): CustomizationFileMeta | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const url = typeof o.url === "string" ? o.url.trim() : "";
  const fileId = typeof o.fileId === "string" ? o.fileId.trim() : "";
  const filename = typeof o.filename === "string" ? o.filename.trim() : "";
  if (!url || !fileId || !filename) return null;
  return { url, fileId, filename };
}

function parseFilesMap(raw: unknown): CustomizationFilesMap | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const rec = raw as Record<string, unknown>;
  const out: CustomizationFilesMap = {};
  for (const [key, val] of Object.entries(rec)) {
    if (!key.trim()) continue;
    if (Array.isArray(val)) {
      const list = val.map(normalizeFileMeta).filter(Boolean) as CustomizationFileMeta[];
      if (list.length) out[key] = list;
    } else {
      const one = normalizeFileMeta(val);
      if (one) out[key] = one;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function parseDataMap(raw: unknown): CustomizationDataMap | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const rec = raw as Record<string, unknown>;
  const out: CustomizationDataMap = {};
  for (const [key, val] of Object.entries(rec)) {
    if (!key.trim()) continue;
    if (typeof val === "string") {
      out[key] = val;
    } else if (typeof val === "boolean") {
      out[key] = val;
    } else if (Array.isArray(val)) {
      const strs = val.filter((x): x is string => typeof x === "string");
      if (strs.length) out[key] = strs;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Validate schema-driven personalization for one cart line. Throws Error with message on failure.
 * Returns normalized payloads to persist on OrderItem.
 */
export function validateSchemaLineCustomization(
  productName: string,
  customizationFieldsRaw: unknown,
  line: LineCustomizationPayload,
): {
  customizationData?: CustomizationDataMap;
  customizationFiles?: CustomizationFilesMap;
} {
  const fields = parseProductCustomizationFields(customizationFieldsRaw);
  if (!fields.length) {
    return {};
  }

  const data = parseDataMap(line.customizationData) ?? {};
  const files = parseFilesMap(line.customizationFiles) ?? {};

  const client = validateClientCustomization(fields, data, files);
  if (!client.ok) {
    throw new Error(`Complete personalisation for ${productName} before checkout`);
  }

  for (const f of fields) {
    if (f.type !== "image") continue;
    const v = files[f.key];
    const list = Array.isArray(v) ? v : v ? [v] : [];
    for (const m of list) {
      if (!isTrustedCustomizationAssetUrl(m.url)) {
        throw new Error(`Invalid upload URL for ${productName}`);
      }
    }
  }

  for (const f of fields) {
    if (f.type === "url") {
      const raw = typeof data[f.key] === "string" ? (data[f.key] as string).trim() : "";
      if (raw && !/^https?:\/\//i.test(raw)) {
        throw new Error(`Enter a valid link for ${f.label} (${productName})`);
      }
    }
  }

  const customizationData: CustomizationDataMap = { ...data };
  for (const f of fields) {
    if (f.type !== "image") continue;
    const v = files[f.key];
    const list = Array.isArray(v) ? v : v ? [v] : [];
    if (!list.length) continue;
    const urls = list.map((x) => x.url);
    customizationData[f.key] = f.multiple ? urls : urls[0]!;
  }

  return {
    customizationData,
    customizationFiles: Object.keys(files).length ? files : undefined,
  };
}
