import { z } from "zod";
import { connectDb } from "@/lib/db";
import { registerStorefrontUser } from "@/lib/services/authService";
import { jsonOk, jsonError } from "@/lib/api/response";
import { clientIpFromRequest, rateLimitMemory, requireJsonContentType } from "@/lib/auth/rate-limit-memory";
import { notifyWelcomeEmail } from "@/lib/notify/dispatch";

const bodySchema = z.object({
  fullName: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  phone: z
    .string()
    .optional()
    .refine((p) => !p || /^[6-9]\d{9}$/.test(p), {
      message: "Enter a valid 10-digit mobile number",
    }),
});

export async function POST(req: Request) {
  if (!requireJsonContentType(req)) {
    return jsonError("Content-Type must be application/json", 415);
  }
  const ip = clientIpFromRequest(req);
  if (!rateLimitMemory(`reg:${ip}`, 5, 60 * 60 * 1000)) {
    return jsonError("Too many registration attempts. Try again later.", 429);
  }

  try {
    await connectDb();
    const body = bodySchema.parse(await req.json());
    const { userId } = await registerStorefrontUser({
      fullName: body.fullName,
      email: body.email,
      password: body.password,
      phone: body.phone,
    });
    if (process.env.EMAIL_ENABLED === "true") {
      void notifyWelcomeEmail(body.email.toLowerCase(), body.fullName.trim()).catch(() => {});
    } else {
      console.info(`[auth] New user registered (welcome email skipped): ${body.email}`);
    }
    return jsonOk({ success: true, userId });
  } catch (e) {
    if (e instanceof z.ZodError) {
      const first = e.flatten().fieldErrors;
      return jsonError("Invalid input", 400, { issues: first });
    }
    if (e instanceof Error && e.message === "EMAIL_TAKEN") {
      return jsonError("Email already registered", 409);
    }
    return jsonError("Registration failed", 400);
  }
}
