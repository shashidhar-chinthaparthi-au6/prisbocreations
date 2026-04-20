/** Known PIN → city/state for auto-fill; unknown 6-digit PINs still allow manual entry. */
const KNOWN: Record<string, { city: string; state: string }> = {
  "560001": { city: "Bengaluru", state: "Karnataka" },
  "560002": { city: "Bengaluru", state: "Karnataka" },
  "560003": { city: "Bengaluru", state: "Karnataka" },
  "560038": { city: "Bengaluru", state: "Karnataka" },
  "560103": { city: "Bengaluru", state: "Karnataka" },
  "400001": { city: "Mumbai", state: "Maharashtra" },
  "110001": { city: "New Delhi", state: "Delhi" },
  "600001": { city: "Chennai", state: "Tamil Nadu" },
  "700001": { city: "Kolkata", state: "West Bengal" },
};

/** Rough state inference from PIN prefix when not in KNOWN (best-effort). */
function inferState(pin: string): string | null {
  const p = pin.slice(0, 1);
  const map: Record<string, string> = {
    "1": "Delhi",
    "2": "Uttar Pradesh",
    "3": "Gujarat",
    "4": "Maharashtra",
    "5": "Karnataka",
    "6": "Tamil Nadu",
    "7": "West Bengal",
    "8": "Bihar",
  };
  return map[p] ?? null;
}

export function lookupPincode(pincode: string): {
  valid: boolean;
  city: string;
  state: string;
} {
  const pin = pincode.replace(/\D/g, "").slice(0, 6);
  if (pin.length !== 6) {
    return { valid: false, city: "", state: "" };
  }
  const hit = KNOWN[pin];
  if (hit) return { valid: true, city: hit.city, state: hit.state };
  const st = inferState(pin);
  if (st) {
    return { valid: true, city: "", state: st };
  }
  return { valid: false, city: "", state: "" };
}
