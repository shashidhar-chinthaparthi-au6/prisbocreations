import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDb } from "@/lib/db";
import { notifyWelcomeEmail } from "@/lib/notify/dispatch";
import { registerUser } from "@/lib/services/authService";
import { setSessionCookie } from "@/lib/auth/session";
import { jsonCreated, jsonError } from "@/lib/api/response";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  phone: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    await connectDb();
    const json = await req.json();
    const input = bodySchema.parse(json);
    const { user, token } = await registerUser(input);
    void notifyWelcomeEmail(user.email, user.name).catch(() => {});
    await setSessionCookie(token);
    return jsonCreated({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
      },
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return jsonError("Invalid input", 400, { issues: e.flatten() });
    }
    const msg = e instanceof Error ? e.message : "Registration failed";
    return jsonError(msg, 400);
  }
}
