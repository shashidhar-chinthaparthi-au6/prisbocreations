import { z } from "zod";
import { connectDb } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/api/response";
import { lookupOrderForTrack } from "@/lib/services/orderService";

const schema = z.object({
  identifier: z.string().min(1).max(200),
  email: z.string().email(),
});

/** Public: find order by MongoDB id or invoice number + owning email. */
export async function POST(req: Request) {
  try {
    await connectDb();
    const body = schema.parse(await req.json());
    const order = await lookupOrderForTrack(body.identifier, body.email);
    return jsonOk(order);
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid input", 400);
    const msg = e instanceof Error ? e.message : "Lookup failed";
    return jsonError(msg, 404);
  }
}
