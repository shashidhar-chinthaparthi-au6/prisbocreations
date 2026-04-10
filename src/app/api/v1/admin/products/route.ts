import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { zImageRefArray } from "@/lib/api/imageRef";
import { slugify } from "@/lib/slugify";
import { adminCreateProduct, adminListProducts } from "@/lib/services/catalogService";

const createSchema = z.object({
  subcategoryId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  pricePaise: z.number().int().positive(),
  sku: z.string().min(1),
  stock: z.number().int().min(0),
  images: zImageRefArray(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  await connectDb();
  return jsonOk(await adminListProducts());
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    await connectDb();
    const body = createSchema.parse(await req.json());
    const p = await adminCreateProduct({ ...body, slug: slugify(body.name) });
    return jsonOk(p);
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid input", 400);
    const msg = e instanceof Error ? e.message : "Failed";
    return jsonError(msg, 400);
  }
}
