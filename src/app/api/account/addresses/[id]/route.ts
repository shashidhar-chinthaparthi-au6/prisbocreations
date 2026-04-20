import { z } from "zod";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { listAddressesForUser, updateUserAddress, deleteUserAddress } from "@/lib/account/address-service";
import { addressDocToMeDto } from "@/lib/account/user-address-dto";
import { normalizeIndianMobile10, isIndianMobile10 } from "@/lib/account/phone-in";

const patchSchema = z.object({
  label: z.enum(["Home", "Office", "Other"]).optional(),
  fullName: z.string().min(2).max(80).optional(),
  phone: z
    .string()
    .optional()
    .transform((s) => (s === undefined ? undefined : normalizeIndianMobile10(s))),
  line1: z.string().min(5).max(200).optional(),
  line2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().min(2).optional(),
  state: z.string().min(2).optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  isDefault: z.boolean().optional(),
});

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return jsonError("Not found", 404);

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await req.json());
  } catch {
    return jsonError("Invalid input", 400);
  }

  if (Object.keys(body).length === 0) {
    return jsonError("No fields to update", 400);
  }

  if (body.phone !== undefined && !isIndianMobile10(body.phone)) {
    return jsonError("Enter a valid 10-digit mobile number", 400);
  }

  await connectDb();
  try {
    const payload: Parameters<typeof updateUserAddress>[2] = {};
    if (body.label !== undefined) payload.label = body.label;
    if (body.fullName !== undefined) payload.fullName = body.fullName.trim();
    if (body.phone !== undefined) payload.phone = body.phone;
    if (body.line1 !== undefined) payload.line1 = body.line1.trim();
    if (body.line2 !== undefined) payload.line2 = body.line2?.trim() || undefined;
    if (body.city !== undefined) payload.city = body.city.trim();
    if (body.state !== undefined) payload.state = body.state.trim();
    if (body.pincode !== undefined) payload.pincode = body.pincode;
    if (body.isDefault !== undefined) payload.isDefault = body.isDefault;
    await updateUserAddress(auth.session.sub, id, payload);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "not_found") return jsonError("Not found", 404);
    return jsonError("Could not update address", 400);
  }

  const rows = await listAddressesForUser(auth.session.sub);
  return jsonOk({ addresses: rows.map((r) => addressDocToMeDto(r)) });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return jsonError("Not found", 404);

  await connectDb();
  try {
    await deleteUserAddress(auth.session.sub, id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "not_found") return jsonError("Not found", 404);
    if (msg === "cannot_delete_only_default") {
      return jsonError("Set another address as default first", 400);
    }
    return jsonError("Could not delete address", 400);
  }

  const rows = await listAddressesForUser(auth.session.sub);
  return jsonOk({ addresses: rows.map((r) => addressDocToMeDto(r)) });
}
