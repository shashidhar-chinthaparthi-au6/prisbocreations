import { z } from "zod";
import { connectDb } from "@/lib/db";
import { loginUser } from "@/lib/services/authService";
import { setSessionCookie } from "@/lib/auth/session";
import { jsonOk, jsonError } from "@/lib/api/response";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    await connectDb();
    const json = await req.json();
    const input = bodySchema.parse(json);
    const { user, token } = await loginUser(input);
    await setSessionCookie(token);
    return jsonOk({
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
      return jsonError("Invalid input", 400);
    }
    return jsonError("Invalid email or password", 401);
  }
}
