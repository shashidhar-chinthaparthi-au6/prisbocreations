import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db";
import { registerStorefrontUser } from "@/lib/services/authService";
import { jsonOk, jsonError } from "@/lib/api/response";
import { clientIpFromRequest, rateLimitMemory, requireJsonContentType } from "@/lib/auth/rate-limit-memory";
import { notifyWelcomeEmail } from "@/lib/notify/dispatch";
import { registerFieldsSchema } from "@/lib/validators/auth";

export async function POST(req: Request) {
  if (!requireJsonContentType(req)) {
    return jsonError("Content-Type must be application/json", 415);
  }
  const ip = clientIpFromRequest(req);
  if (!rateLimitMemory(`reg:${ip}`, 5, 60 * 60 * 1000)) {
    return NextResponse.json(
      {
        error:
          "Too many accounts created from this device. Please try again in an hour.",
      },
      { status: 429 },
    );
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError("Invalid JSON", 400);
    }

    const parsed = registerFieldsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten().fieldErrors },
        { status: 422 },
      );
    }

    await connectDb();
    const { fullName, email, password, phone } = parsed.data;

    const { userId, fullName: savedName } = await registerStorefrontUser({
      fullName,
      email,
      password,
      phone,
    });

    if (process.env.EMAIL_ENABLED === "true") {
      void notifyWelcomeEmail(email, savedName.trim()).catch(() => {});
    } else {
      console.info(`[auth] New user registered (welcome email skipped): ${email}`);
    }

    return jsonOk({
      success: true,
      userId,
      fullName: savedName,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "EMAIL_TAKEN") {
      return NextResponse.json(
        {
          errors: {
            email: ["An account with this email already exists"],
          },
        },
        { status: 409 },
      );
    }
    return jsonError("Registration failed", 400);
  }
}
