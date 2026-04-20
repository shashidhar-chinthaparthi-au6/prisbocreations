import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    fullName: z.string().min(2, "Name must be at least 2 characters").max(80, "Name is too long"),
    email: z.string().email("Enter a valid email address"),
    phone: z
      .preprocess((v) => (v === "" || v === undefined || v === null ? undefined : v), z.string())
      .optional()
      .refine((s) => s === undefined || /^[6-9]\d{9}$/.test(s), {
        message: "Enter a valid 10-digit mobile number",
      }),
    password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password is too long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
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

export function safeRedirectPath(redirect: string | null | undefined, fallback = "/account/orders"): string {
  const p = redirect?.trim() ?? "";
  if (!p.startsWith("/") || p.startsWith("//")) return fallback;
  return p;
}
