import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { normalizeAddress, userAddressSchema } from "@/lib/user-address";
import { listAddressesForUser, createUserAddress, updateUserAddress, deleteUserAddress } from "@/lib/account/address-service";
import { addressDocToMeDto } from "@/lib/account/user-address-dto";

function rowsToResponse(rows: Awaited<ReturnType<typeof listAddressesForUser>>) {
  return rows.map((r) => addressDocToMeDto(r));
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let addr: ReturnType<typeof normalizeAddress>;
  try {
    addr = normalizeAddress(userAddressSchema.parse(await req.json()));
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid address", 400);
    return jsonError("Invalid JSON", 400);
  }

  await connectDb();
  try {
    await createUserAddress(auth.session.sub, {
      label: "Home",
      fullName: addr.fullName,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2,
      city: addr.city,
      state: addr.state,
      pincode: addr.postalCode.replace(/\D/g, "").slice(0, 6),
      country: addr.country,
      isDefault: false,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "address_limit") return jsonError("Address limit reached", 400);
    return jsonError("Could not save address", 400);
  }

  const rows = await listAddressesForUser(auth.session.sub);
  return jsonOk({ addresses: rowsToResponse(rows) });
}

const patchIndexSchema = z.object({
  index: z.number().int().min(0),
  address: userAddressSchema,
});

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: z.infer<typeof patchIndexSchema>;
  try {
    body = patchIndexSchema.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid input", 400);
    return jsonError("Invalid JSON", 400);
  }

  await connectDb();
  const rows = await listAddressesForUser(auth.session.sub);
  if (body.index >= rows.length) return jsonError("Address not found", 404);

  const id = String(rows[body.index]!._id);
  const next = normalizeAddress(body.address);

  try {
    await updateUserAddress(auth.session.sub, id, {
      label: rows[body.index]!.label as "Home" | "Office" | "Other",
      fullName: next.fullName,
      phone: next.phone,
      line1: next.line1,
      line2: next.line2,
      city: next.city,
      state: next.state,
      pincode: next.postalCode.replace(/\D/g, "").slice(0, 6),
      country: next.country,
    });
  } catch {
    return jsonError("Could not update address", 400);
  }

  const fresh = await listAddressesForUser(auth.session.sub);
  return jsonOk({ addresses: rowsToResponse(fresh) });
}

const deleteSchema = z.object({
  index: z.number().int().min(0),
});

export async function DELETE(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: z.infer<typeof deleteSchema>;
  try {
    body = deleteSchema.parse(await req.json());
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid input", 400);
    return jsonError("Invalid JSON", 400);
  }

  await connectDb();
  const rows = await listAddressesForUser(auth.session.sub);
  if (body.index >= rows.length) return jsonError("Address not found", 404);

  const id = String(rows[body.index]!._id);
  try {
    await deleteUserAddress(auth.session.sub, id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "cannot_delete_only_default") {
      return jsonError("Set another address as default first", 400);
    }
    return jsonError("Could not delete address", 400);
  }

  const fresh = await listAddressesForUser(auth.session.sub);
  return jsonOk({ addresses: rowsToResponse(fresh) });
}
