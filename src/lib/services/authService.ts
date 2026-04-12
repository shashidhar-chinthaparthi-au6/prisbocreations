import { createHash, randomBytes } from "crypto";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, type UserDoc } from "@/lib/models/User";
import { signAccessToken, type JwtPayload } from "@/lib/auth/jwt";
import { appBaseUrl } from "@/lib/notify/config";
import { notifyPasswordResetEmail } from "@/lib/notify/dispatch";

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

function hashPasswordResetToken(token: string): string {
  const secret = process.env.JWT_SECRET ?? "";
  return createHash("sha256").update(`pwdreset:${secret}:${token}`).digest("hex");
}

/** Always resolves; does not reveal whether the email exists. */
export async function requestPasswordReset(emailRaw: string): Promise<void> {
  const email = emailRaw.trim().toLowerCase();
  if (!email) return;
  const user = await User.findOne({ email });
  if (!user) return;

  const token = randomBytes(32).toString("base64url");
  const hash = hashPasswordResetToken(token);
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  await User.findByIdAndUpdate(user._id, {
    passwordResetTokenHash: hash,
    passwordResetExpires: expires,
  });

  const link = `${appBaseUrl()}/reset-password?uid=${user._id.toString()}&token=${encodeURIComponent(token)}`;
  await notifyPasswordResetEmail(user.email, link);
}

export async function resetPasswordWithToken(
  uid: string,
  token: string,
  newPassword: string,
): Promise<void> {
  if (newPassword.length < 8) {
    throw new Error("Password must be at least 8 characters");
  }
  if (!mongoose.Types.ObjectId.isValid(uid)) {
    throw new Error("Invalid or expired reset link");
  }

  const user = await User.findById(uid)
    .select("+passwordResetTokenHash +passwordResetExpires")
    .exec();
  if (
    !user?.passwordResetTokenHash ||
    !user.passwordResetExpires ||
    user.passwordResetExpires.getTime() < Date.now()
  ) {
    throw new Error("Invalid or expired reset link");
  }
  if (user.passwordResetTokenHash !== hashPasswordResetToken(token)) {
    throw new Error("Invalid or expired reset link");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await User.findByIdAndUpdate(user._id, {
    passwordHash,
    $unset: { passwordResetTokenHash: 1, passwordResetExpires: 1 },
  });
}
