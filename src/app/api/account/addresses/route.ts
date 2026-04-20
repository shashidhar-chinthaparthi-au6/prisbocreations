import { z } from "zod";
import { connectDb } from "@/lib/db";
import { requireAuth } from "@/lib/api/auth";
import { jsonOk, jsonError } from "@/lib/api/response";
import { listAddressesForUser, createUserAddress, countAddresses } from "@/lib/account/address-service";
import { addressDocToMeDto } from "@/lib/account/user-address-dto";
import { normalizeIndianMobile10, isIndianMobile10 } from "@/lib/account/phone-in";

const postSchema = z.object({
  label: z.enum(["Home", "Office", "Other"]).default("Home"),
  fullName: z.string().min(2).max(80),
  phone: z.string().transform((s) => normalizeIndianMobile10(s)),
  line1: z.string().min(5).max(200),
  line2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/),
  isDefault: z.boolean().default(false),
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  await connectDb();
  const rows = await listAddressesForUser(auth.session.sub);
  const addresses = rows.map((r) => addressDocToMeDto(r));
  const count = addresses.length;
  return jsonOk({ addresses, count, max: 10 });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;

  let body: z.infer<typeof postSchema>;
  try {
    const raw = postSchema.parse(await req.json());
    if (!isIndianMobile10(raw.phone)) {
      return jsonError("Enter a valid 10-digit mobile number", 400);
    }
    body = raw;
  } catch (e) {
    if (e instanceof z.ZodError) return jsonError("Invalid address", 400);
    return jsonError("Invalid JSON", 400);
  }

  await connectDb();
  try {
    await createUserAddress(auth.session.sub, {
      label: body.label,
      fullName: body.fullName.trim(),
      phone: body.phone,
      line1: body.line1.trim(),
      line2: body.line2?.trim() || undefined,
      city: body.city.trim(),
      state: body.state.trim(),
      pincode: body.pincode,
      country: "India",
      isDefault: body.isDefault,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "address_limit") return jsonError("You've reached the limit of 10 saved addresses", 400);
    return jsonError("Could not save address", 400);
  }

  const rows = await listAddressesForUser(auth.session.sub);
  const count = await countAddresses(auth.session.sub);
  return jsonOk({
    addresses: rows.map((r) => addressDocToMeDto(r)),
    count,
    max: 10,
  });
}
