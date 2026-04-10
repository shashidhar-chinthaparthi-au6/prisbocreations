import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { zImageRefArray } from "@/lib/api/imageRef";
import { slugify } from "@/lib/slugify";
import { adminCreateCategory, listCategories } from "@/lib/services/catalogService";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().optional(),
  images: zImageRefArray().min(1, "At least one image is required"),
});

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  await connectDb();
  return jsonOk(await listCategories());
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    await connectDb();
    const body = createSchema.parse(await req.json());
    const cat = await adminCreateCategory({ ...body, slug: slugify(body.name) });
    return jsonOk(cat);
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid input", 400);
    const msg = e instanceof Error ? e.message : "Failed";
    return jsonError(msg, 400);
  }
}
