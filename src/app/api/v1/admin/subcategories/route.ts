import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { zImageRef, zImageRefArray } from "@/lib/api/imageRef";
import { adminCreateSubcategory, adminListSubcategories } from "@/lib/services/catalogService";

const createSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().optional(),
  images: zImageRefArray().optional(),
  imageUrl: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? undefined : v),
    zImageRef().optional(),
  ),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  await connectDb();
  return jsonOk(await adminListSubcategories());
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    await connectDb();
    const body = createSchema.parse(await req.json());
    const doc = await adminCreateSubcategory(body);
    return jsonOk(doc);
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid input", 400);
    const msg = e instanceof Error ? e.message : "Failed";
    return jsonError(msg, 400);
  }
}
