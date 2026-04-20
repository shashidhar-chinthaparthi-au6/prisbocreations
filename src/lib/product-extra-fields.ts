/** Preset labels for specification rows (admin can type any key). */
export const STANDARD_SPEC_KEYS = [
  "Material",
  "Dimensions",
  "Weight",
  "Colour / finish",
  "Origin",
  "Care instructions",
  "Warranty",
  "Package contents",
] as const;

export type SpecificationRow = { key: string; value: string };

export function emptySpecificationRow(): SpecificationRow {
  return { key: "", value: "" };
}

/** Non-empty lines from a textarea (features / highlights). */
export function linesFromTextarea(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}
