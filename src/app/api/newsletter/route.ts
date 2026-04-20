import { z } from "zod";
import { connectDb } from "@/lib/db";
import { jsonOk, jsonError } from "@/lib/api/response";
import { NewsletterSubscriber } from "@/lib/models/NewsletterSubscriber";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: Request) {
  try {
    await connectDb();
    const { email } = schema.parse(await req.json());
    await NewsletterSubscriber.findOneAndUpdate(
      { email },
      { $setOnInsert: { email, source: "storefront" } },
      { upsert: true },
    );
    return jsonOk({ subscribed: true });
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid email", 400);
    return jsonError("Could not subscribe", 500);
  }
}
