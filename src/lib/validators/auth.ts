import { z } from "zod";

const phoneDigits = z.preprocess((v) => {
  if (v === "" || v === undefined || v === null) return undefined;
  return String(v).replace(/\D/g, "");
}, z.union([z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"), z.undefined()]));

/** Fields sent to POST /api/auth/register (no confirmPassword). */
export const registerFieldsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name is too long")
    .regex(/^[a-zA-Z\s\-'.]+$/, "Name can only contain letters and spaces"),

  email: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .transform((s) => s.toLowerCase()),

  phone: phoneDigits.optional(),

  password: z.string().min(8, "Password must be at least 8 characters").max(72, "Password is too long"),
});

export const registerSchema = registerFieldsSchema
  .extend({
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
