import { lookupPincode } from "@/lib/data/pincode-lookup";
import { jsonOk, jsonError } from "@/lib/api/response";

export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code")?.trim() ?? "";
  const pin = code.replace(/\D/g, "");
  if (pin.length !== 6) {
    return jsonError("Enter a 6-digit PIN code", 400);
  }
  const r = lookupPincode(pin);
  return jsonOk({
    city: r.city,
    state: r.state,
    valid: r.valid,
  });
}
