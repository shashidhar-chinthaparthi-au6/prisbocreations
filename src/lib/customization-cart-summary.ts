import type {
  CustomizationDataMap,
  CustomizationFieldDef,
  CustomizationFilesMap,
  CustomizationFileMeta,
} from "@/lib/customization-types";

export type CartCustomizationSummaryRow =
  | { kind: "text"; label: string; value: string; isSpotify?: boolean }
  | {
      kind: "image";
      label: string;
      filename: string;
      thumbUrl: string;
    };

function fileList(files: CustomizationFilesMap | undefined, key: string): CustomizationFileMeta[] {
  if (!files?.[key]) return [];
  const v = files[key];
  return Array.isArray(v) ? v : [v];
}

export function cartCustomizationSummaryRows(
  schema: CustomizationFieldDef[],
  data?: CustomizationDataMap,
  files?: CustomizationFilesMap,
): CartCustomizationSummaryRow[] {
  const rows: CartCustomizationSummaryRow[] = [];
  for (const f of schema) {
    if (f.type === "image") {
      const list = fileList(files, f.key);
      for (const m of list) {
        rows.push({
          kind: "image",
          label: f.label,
          filename: m.filename,
          thumbUrl: m.url,
        });
      }
      continue;
    }
    if (f.type === "boolean") {
      const v = data?.[f.key];
      const on = v === true;
      rows.push({
        kind: "text",
        label: f.label,
        value: on ? "Yes" : "No",
      });
      continue;
    }
    if (f.type === "url") {
      const raw = typeof data?.[f.key] === "string" ? (data[f.key] as string).trim() : "";
      if (!raw) continue;
      rows.push({
        kind: "text",
        label: f.label,
        value: raw,
        isSpotify: f.key === "spotify_url",
      });
      continue;
    }
    const raw = typeof data?.[f.key] === "string" ? (data[f.key] as string).trim() : "";
    if (!raw) continue;
    rows.push({ kind: "text", label: f.label, value: raw });
  }
  return rows;
}
