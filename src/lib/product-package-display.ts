/** Customer-facing copy for packed weight (kg). */
export function formatPackedWeightKg(kg: number): string {
  if (!Number.isFinite(kg) || kg <= 0) return "";
  if (kg < 1) return `${Math.round(kg * 1000)}g`;
  const r = Math.round(kg * 10) / 10;
  return `${Number(r.toFixed(1))}kg`;
}

/** Spec table rows: packed weight + L×B×H (cm), after schema-driven specs. */
export function packageDimensionSpecRows(input: {
  weightKg: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
}): { key: string; value: string }[] {
  const w = formatPackedWeightKg(input.weightKg);
  const dims = `${input.lengthCm} × ${input.breadthCm} × ${input.heightCm} cm (L × B × H)`;
  if (!w) return [];
  return [
    { key: "Weight", value: w },
    { key: "Dimensions", value: dims },
  ];
}
