import { z } from "zod";

/** Saved shipping address (matches `User` embedded schema + checkout `shipping`). */
export const userAddressSchema = z.object({
  fullName: z.string().min(1).max(120),
  phone: z.string().min(5).max(32),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(3).max(20),
  country: z.string().min(1).max(80).optional(),
});

export type UserAddressInput = z.infer<typeof userAddressSchema>;

export function normalizeAddress(a: UserAddressInput) {
  return {
    fullName: a.fullName.trim(),
    phone: a.phone.trim(),
    line1: a.line1.trim(),
    line2: (a.line2 ?? "").trim() || undefined,
    city: a.city.trim(),
    state: a.state.trim(),
    postalCode: a.postalCode.trim(),
    country: (a.country?.trim() || "India"),
  };
}
