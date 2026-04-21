import type {
  CustomizationFieldDef,
  CustomizationDataMap,
  CustomizationFilesMap,
  CustomizationFileMeta,
} from "@/lib/customization-types";

function fileListForField(
  files: CustomizationFilesMap | undefined,
  key: string,
): CustomizationFileMeta[] {
  if (!files || !files[key]) return [];
  const v = files[key];
  return Array.isArray(v) ? v : [v];
}

function textValue(data: CustomizationDataMap | undefined, key: string): string {
  const v = data?.[key];
  if (typeof v === "string") return v.trim();
  if (typeof v === "boolean") return v ? "yes" : "";
  return "";
}

/** Client-side: required fields and max lengths (no URL trust). */
export function validateClientCustomization(
  fields: CustomizationFieldDef[],
  data: CustomizationDataMap | undefined,
  files: CustomizationFilesMap | undefined,
): { ok: boolean; firstInvalidKey?: string } {
  for (const f of fields) {
    if (f.type === "image") {
      const list = fileListForField(files, f.key);
      const maxFiles = f.maxFiles ?? (f.multiple ? 16 : 1);
      if (f.required && list.length < 1) {
        return { ok: false, firstInvalidKey: f.key };
      }
      if (f.multiple && list.length > maxFiles) {
        return { ok: false, firstInvalidKey: f.key };
      }
      continue;
    }
    if (f.type === "boolean") {
      if (f.required && data?.[f.key] === undefined) {
        return { ok: false, firstInvalidKey: f.key };
      }
      continue;
    }
    const raw = textValue(data, f.key);
    if (f.type === "select") {
      if (f.required && !raw) return { ok: false, firstInvalidKey: f.key };
      if (raw && f.options?.length && !f.options.includes(raw)) {
        return { ok: false, firstInvalidKey: f.key };
      }
      if (f.maxChars && raw.length > f.maxChars) {
        return { ok: false, firstInvalidKey: f.key };
      }
      continue;
    }
    if (f.type === "url") {
      if (f.required && !raw) return { ok: false, firstInvalidKey: f.key };
      if (raw && raw.length > 2000) return { ok: false, firstInvalidKey: f.key };
      if (f.maxChars && raw.length > f.maxChars) {
        return { ok: false, firstInvalidKey: f.key };
      }
      continue;
    }
    if (f.required && !raw) {
      return { ok: false, firstInvalidKey: f.key };
    }
    if (f.maxChars && raw.length > f.maxChars) {
      return { ok: false, firstInvalidKey: f.key };
    }
  }
  return { ok: true };
}
