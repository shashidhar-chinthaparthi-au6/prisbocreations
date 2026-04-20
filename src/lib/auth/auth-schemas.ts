import { z } from "zod";

export { registerSchema, registerFieldsSchema, type RegisterInput } from "@/lib/validators/auth";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotSchema = z.object({
  email: z.string().email("Enter a valid email address"),
});

export const resetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters").max(72),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export function safeRedirectPath(redirect: string | null | undefined, fallback = "/"): string {
  const p = redirect?.trim() ?? "";
  if (!p.startsWith("/") || p.startsWith("//")) return fallback;
  return p;
}
