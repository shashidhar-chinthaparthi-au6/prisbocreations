import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAdmin } from "@/lib/api/auth";
import { jsonError, jsonOk } from "@/lib/api/response";
import { getAdminHomeHeroConfig, replaceHomeHeroSlides } from "@/lib/services/homeHeroService";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    await connectDb();
    return jsonOk(await getAdminHomeHeroConfig());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    return jsonError(msg, 500);
  }
}

export async function PUT(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  try {
    await connectDb();
    const body = await req.json();
    const data = await replaceHomeHeroSlides(body);
    revalidatePath("/");
    return jsonOk(data);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return jsonError("Invalid input", 400, { issues: e.flatten() });
    }
    const msg = e instanceof Error ? e.message : "Failed";
    return jsonError(msg, 400);
  }
}
