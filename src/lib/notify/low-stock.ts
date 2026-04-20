import mongoose from "mongoose";
import { Product } from "@/lib/models/Product";
import { appBaseUrl } from "@/lib/notify/config";
import { notify } from "@/lib/notify/dispatch";
import { productOptionsFromDoc, productHasOptions } from "@/lib/product-options";

const THRESHOLD = 5;

export async function notifyLowStockForProductIds(productIds: string[]): Promise<void> {
  const unique = [...new Set(productIds.filter(Boolean))];
  if (!unique.length) return;

  const products = await Product.find({
    _id: { $in: unique.map((id) => new mongoose.Types.ObjectId(id)) },
  }).lean();

  const base = appBaseUrl();
  const items: {
    productName: string;
    variantName: string;
    size: string;
    stock: number;
    sku: string;
    editUrl: string;
  }[] = [];

  for (const p of products) {
    const pid = String(p._id);
    const editUrl = `${base}/admin/products/${pid}/edit`;

    if (productHasOptions(p)) {
      for (const o of productOptionsFromDoc(p)) {
        if (o.stock <= THRESHOLD && o.stock >= 0) {
          items.push({
            productName: p.name,
            variantName: o.label,
            size: "—",
            stock: o.stock,
            sku: (o.sku && o.sku.trim()) || p.sku,
            editUrl,
          });
        }
      }
    } else if (p.stock <= THRESHOLD && p.stock >= 0) {
      items.push({
        productName: p.name,
        variantName: "Default",
        size: "—",
        stock: p.stock,
        sku: p.sku,
        editUrl,
      });
    }

    const cvs = (p as { colourVariants?: Array<{ displayName: string; skuSuffix: string; sizeStocks?: Array<{ size: string; stock: number }> }> }).colourVariants;
    const skuBase = (p as { skuBase?: string }).skuBase || p.sku;
    if (Array.isArray(cvs)) {
      for (const cv of cvs) {
        for (const ss of cv.sizeStocks ?? []) {
          if (ss.stock <= THRESHOLD && ss.stock >= 0) {
            items.push({
              productName: p.name,
              variantName: cv.displayName,
              size: ss.size,
              stock: ss.stock,
              sku: `${skuBase}-${cv.skuSuffix}-${ss.size}`,
              editUrl,
            });
          }
        }
      }
    }
  }

  if (items.length > 0) {
    await notify("ADMIN_LOW_STOCK", { items });
  }
}
