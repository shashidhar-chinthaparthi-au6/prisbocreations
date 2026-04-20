import { z } from "zod";
import { connectDb } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/api/response";
import { Product } from "@/lib/models/Product";
import { storefrontPublishedMatch } from "@/lib/services/storefrontCatalog";
import { minOptionPricePaise, productHasOptions, productOptionsFromDoc } from "@/lib/product-options";
import mongoose from "mongoose";

const lineSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive(),
  optionKey: z.string().optional(),
  colorKey: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    await connectDb();
    const body = z.object({ lines: z.array(lineSchema).min(1) }).parse(await req.json());
    const ids = [...new Set(body.lines.map((l) => l.productId))];
    const oids = ids.filter((id) => mongoose.isValidObjectId(id));
    if (!oids.length) return jsonError("Invalid products", 400);

    const products = await Product.find({
      _id: { $in: oids.map((id) => new mongoose.Types.ObjectId(id)) },
      ...storefrontPublishedMatch(),
    }).lean();

    const byId = new Map(products.map((p) => [String(p._id), p]));
    const issues: string[] = [];
    const lines: Array<{
      productId: string;
      ok: boolean;
      unitPricePaise: number;
      maxQty: number;
      name: string;
      slug: string;
    }> = [];

    for (const line of body.lines) {
      const p = byId.get(line.productId);
      if (!p) {
        issues.push(`Product unavailable`);
        lines.push({
          productId: line.productId,
          ok: false,
          unitPricePaise: 0,
          maxQty: 0,
          name: "",
          slug: "",
        });
        continue;
      }
      let unitPricePaise = p.pricePaise;
      let maxQty = p.stock;
      if (productHasOptions(p)) {
        const opts = productOptionsFromDoc(p);
        const key = line.optionKey?.trim();
        const o = key ? opts.find((x) => x.key === key) : opts[0];
        if (!o) {
          issues.push(`${p.name}: choose a valid option`);
          lines.push({
            productId: line.productId,
            ok: false,
            unitPricePaise: minOptionPricePaise(p),
            maxQty: 0,
            name: p.name,
            slug: p.slug,
          });
          continue;
        }
        unitPricePaise = o.pricePaise;
        maxQty = o.stock;
      }
      const ok = line.quantity <= maxQty;
      if (!ok) issues.push(`${p.name}: only ${maxQty} in stock`);
      lines.push({
        productId: line.productId,
        ok,
        unitPricePaise,
        maxQty,
        name: p.name,
        slug: p.slug,
      });
    }

    return jsonOk({ lines, ok: issues.length === 0, issues });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid body", 400);
    const msg = e instanceof Error ? e.message : "Validation failed";
    return jsonError(msg, 400);
  }
}
