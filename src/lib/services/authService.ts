import bcrypt from "bcryptjs";
import { User, type UserDoc } from "@/lib/models/User";
import { signAccessToken, type JwtPayload } from "@/lib/auth/jwt";

export async function registerUser(input: {
  email: string;
  password: string;
  name: string;
  phone?: string;
}): Promise<{ user: UserDoc; token: string; secret: string }> {
  const existing = await User.findOne({ email: input.email.toLowerCase() });
  if (existing) throw new Error("Email already registered");

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await User.create({
    email: input.email.toLowerCase(),
    passwordHash,
    name: input.name,
    phone: input.phone,
    role: "customer",
  });

  const secret = process.env.JWT_SECRET!;
  const payload: JwtPayload = {
    sub: user._id.toString(),
    email: user.email,
    role: user.role as "customer" | "admin",
  };
  const token = signAccessToken(payload, secret);
  return { user, token, secret };
}

export async function loginUser(input: {
  email: string;
  password: string;
}): Promise<{ user: UserDoc; token: string; secret: string }> {
  const user = await User.findOne({ email: input.email.toLowerCase() });
  if (!user) throw new Error("Invalid email or password");

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw new Error("Invalid email or password");

  const secret = process.env.JWT_SECRET!;
  const payload: JwtPayload = {
    sub: user._id.toString(),
    email: user.email,
    role: user.role as "customer" | "admin",
  };
  const token = signAccessToken(payload, secret);
  return { user, token, secret };
}

export async function getUserById(id: string) {
  return User.findById(id).lean();
}
