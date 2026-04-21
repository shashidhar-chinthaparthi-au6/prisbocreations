import { getDefaultDimensions } from "@/lib/shiprocket";

type ColourVar = {
  skuSuffix?: string;
  weightKg?: number | null;
  lengthCm?: number | null;
  breadthCm?: number | null;
  heightCm?: number | null;
};

type ProductPhys = {
  weightKg?: number | null;
  lengthCm?: number | null;
  breadthCm?: number | null;
  heightCm?: number | null;
  colourVariants?: ColourVar[] | null;
};

function finiteOrUndef(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

/** Per line: variant overrides (when set) else product-level packed dimensions. */
export function resolveLineItemShippingPhys(
  product: ProductPhys | null | undefined,
  colorKey?: string | null,
): { weightKg: number; lengthCm: number; breadthCm: number; heightCm: number } {
  const dims = getDefaultDimensions();
  const defW = Number(process.env.SHIPROCKET_DEFAULT_WEIGHT_KG ?? 0.5);
  const ck = colorKey?.trim().toUpperCase() ?? "";
  const cv =
    ck && Array.isArray(product?.colourVariants) ?
      product!.colourVariants!.find((v) => String(v.skuSuffix ?? "").trim().toUpperCase() === ck)
    : undefined;

  const pw = finiteOrUndef(product?.weightKg);
  const pl = finiteOrUndef(product?.lengthCm);
  const pb = finiteOrUndef(product?.breadthCm);
  const ph = finiteOrUndef(product?.heightCm);

  const vw = finiteOrUndef(cv?.weightKg);
  const vl = finiteOrUndef(cv?.lengthCm);
  const vb = finiteOrUndef(cv?.breadthCm);
  const vh = finiteOrUndef(cv?.heightCm);

  return {
    weightKg: vw ?? pw ?? (Number.isFinite(defW) && defW > 0 ? defW : 0.3),
    lengthCm: vl ?? pl ?? dims.length,
    breadthCm: vb ?? pb ?? dims.breadth,
    heightCm: vh ?? ph ?? dims.height,
  };
}
