/**
 * Business / return address for invoices, labels, and packages.
 * Override with env (server) or NEXT_PUBLIC_* (client) if needed.
 */
export type SellerAddress = {
  businessName: string;
  legalName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

const DEFAULTS: SellerAddress = {
  businessName: "Prisbo Creations",
  legalName: "CHINTHAPARTHI SHASHIDHAR RAO",
  phone: "+91 87927 90406",
  line1: "Block 1C, Flat - 1612, Janapriya Nile Valley",
  line2:
    "G86P+M88, PJR Enclave, Janapriya Nile Valley, Miyapur, Hyderabad, Telangana 500050, India",
  city: "Hyderabad",
  state: "Telangana",
  postalCode: "500050",
  country: "India",
};

function pickEnv(keys: string[], fallback: string): string {
  if (typeof process === "undefined") return fallback;
  for (const key of keys) {
    const v = process.env[key];
    if (v && v.trim()) return v.trim();
  }
  return fallback;
}

/** Server: uses SELLER_* or NEXT_PUBLIC_*; client: NEXT_PUBLIC_* or built-in defaults. */
export function getSellerAddress(): SellerAddress {
  return {
    businessName: pickEnv(
      ["NEXT_PUBLIC_SELLER_BUSINESS_NAME", "SELLER_BUSINESS_NAME"],
      DEFAULTS.businessName,
    ),
    legalName: pickEnv(["NEXT_PUBLIC_SELLER_LEGAL_NAME", "SELLER_LEGAL_NAME"], DEFAULTS.legalName),
    phone: pickEnv(["NEXT_PUBLIC_SELLER_PHONE", "SELLER_PHONE"], DEFAULTS.phone),
    line1: pickEnv(["NEXT_PUBLIC_SELLER_ADDRESS_LINE1", "SELLER_ADDRESS_LINE1"], DEFAULTS.line1),
    line2: pickEnv(["NEXT_PUBLIC_SELLER_ADDRESS_LINE2", "SELLER_ADDRESS_LINE2"], DEFAULTS.line2),
    city: pickEnv(["NEXT_PUBLIC_SELLER_CITY", "SELLER_CITY"], DEFAULTS.city),
    state: pickEnv(["NEXT_PUBLIC_SELLER_STATE", "SELLER_STATE"], DEFAULTS.state),
    postalCode: pickEnv(
      ["NEXT_PUBLIC_SELLER_POSTAL_CODE", "SELLER_POSTAL_CODE"],
      DEFAULTS.postalCode,
    ),
    country: pickEnv(["NEXT_PUBLIC_SELLER_COUNTRY", "SELLER_COUNTRY"], DEFAULTS.country),
  };
}

/** Static defaults for documentation / tests. */
export const SELLER_ADDRESS_DEFAULTS = DEFAULTS;
