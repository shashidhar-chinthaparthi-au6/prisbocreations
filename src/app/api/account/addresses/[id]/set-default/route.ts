import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { listAddressesForUser, setDefaultAddress } from "@/lib/account/address-service";
import { addressDocToMeDto } from "@/lib/account/user-address-dto";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return jsonError("Not found", 404);

  await connectDb();
  try {
    await setDefaultAddress(auth.session.sub, id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "not_found") return jsonError("Not found", 404);
    return jsonError("Could not update default", 400);
  }

  const rows = await listAddressesForUser(auth.session.sub);
  return jsonOk({ addresses: rows.map((r) => addressDocToMeDto(r)) });
}
