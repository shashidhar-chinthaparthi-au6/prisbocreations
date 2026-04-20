/**
 * Optional placeholders for admin product forms: same copy for every pack/colour,
 * with values substituted per row.
 *
 * Supported: {{name}}, {{packLabel}}, {{packKey}}, {{price}}, {{colorLabel}},
 * {{colorKey}}, {{index}} (1-based row index). {{pack}} is an alias for {{packLabel}}.
 */
export type ProductTemplateVars = {
  name?: string;
  packLabel?: string;
  packKey?: string;
  price?: string;
  colorLabel?: string;
  colorKey?: string;
  index?: string;
};

export function expandProductTextTemplate(
  template: string,
  vars: ProductTemplateVars,
): string {
  const packLabel = vars.packLabel ?? "";
  const map: Record<string, string> = {
    name: vars.name ?? "",
    packLabel,
    pack: packLabel,
    packKey: vars.packKey ?? "",
    price: vars.price ?? "",
    colorLabel: vars.colorLabel ?? "",
    colorKey: vars.colorKey ?? "",
    index: vars.index ?? "",
  };
  let s = template;
  for (const [k, v] of Object.entries(map)) {
    s = s.split(`{{${k}}}`).join(v);
  }
  return s;
}
