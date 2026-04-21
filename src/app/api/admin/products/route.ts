import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { zObjectId } from "@/lib/admin/zod-objectid";
import {
  adminListProductsV2,
  createAdminProductShell,
} from "@/lib/services/adminCatalogBackend";

const postZ = z.object({
  subcategoryId: zObjectId,
  name: z.string().min(1),
  brand: z.string().min(1),
  skuBase: z.string().min(1),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const status = url.searchParams.get("status") as
    | "DRAFT"
    | "PUBLISHED"
    | "ARCHIVED"
    | "all"
    | null;
  const categoryId = url.searchParams.get("categoryId") ?? undefined;
  const recipient = url.searchParams.get("recipient")?.trim().toLowerCase() || undefined;
  const lowStock = url.searchParams.get("lowStock") === "1";
  const page = url.searchParams.get("page");
  const pageSize = url.searchParams.get("pageSize");
  const sort = url.searchParams.get("sort") as
    | "name"
    | "price"
    | "stock"
    | "updatedAt"
    | null;
  const order = url.searchParams.get("order") as "asc" | "desc" | null;

  await connectDb();
  const result = await adminListProductsV2({
    search,
    status: status ?? "all",
    categoryId,
    recipient,
    lowStock,
    page: page ? Number(page) : undefined,
    pageSize: pageSize ? Number(pageSize) : undefined,
    sort: sort ?? "updatedAt",
    order: order ?? "desc",
  });
  return jsonOk(result);
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const parsed = postZ.safeParse(body);
  if (!parsed.success) return jsonError(parsed.error.message, 400);
  await connectDb();
  try {
    const doc = await createAdminProductShell(parsed.data);
    return jsonOk(doc);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create failed";
    return jsonError(msg, 400);
  }
}
