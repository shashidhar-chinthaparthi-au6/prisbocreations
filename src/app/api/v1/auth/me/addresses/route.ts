import { z } from "zod";
import { connectDb } from "@/lib/db";
import { User } from "@/lib/models/User";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { normalizeAddress, userAddressSchema } from "@/lib/user-address";

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
  const doc = await User.findByIdAndUpdate(
    auth.session.sub,
    { $push: { addresses: addr } },
    { new: true, runValidators: true },
  ).lean();
  if (!doc) return jsonError("Not found", 404);

  return jsonOk({ addresses: doc.addresses ?? [] });
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
  const user = await User.findById(auth.session.sub);
  if (!user) return jsonError("Not found", 404);

  const list = user.addresses ?? [];
  if (body.index >= list.length) return jsonError("Address not found", 404);

  const next = normalizeAddress(body.address);

  list.splice(body.index, 1, next);
  user.markModified("addresses");
  await user.save();

  const fresh = await User.findById(auth.session.sub).lean();
  return jsonOk({ addresses: fresh?.addresses ?? [] });
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
  const user = await User.findById(auth.session.sub);
  if (!user) return jsonError("Not found", 404);

  const list = user.addresses ?? [];
  if (body.index >= list.length) return jsonError("Address not found", 404);

  list.splice(body.index, 1);
  user.markModified("addresses");
  await user.save();

  const fresh = await User.findById(auth.session.sub).lean();
  return jsonOk({ addresses: fresh?.addresses ?? [] });
}
