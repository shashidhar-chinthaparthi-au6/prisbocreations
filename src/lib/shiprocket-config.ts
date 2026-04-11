/** Optional Shiprocket (https://apiv2.shiprocket.in). When unset, shipping integration is disabled. */

export type ShiprocketConfig = {
  /** API user email (with password) for POST /v1/external/auth/login */
  email: string;
  password: string;
  /**
   * Optional static JWT from the same login endpoint (e.g. pasted after calling login in Postman).
   * TSP “API key” strings are not valid here — only the `token` field from auth/login.
   */
  bearerToken?: string;
  /** Pickup location title exactly as in Shiprocket → Settings → Pickup addresses */
  pickupLocationName: string;
  pickupPostcode: string;
  defaultWeightKg: number;
  defaultLengthCm: number;
  defaultBreadthCm: number;
  defaultHeightCm: number;
};

export function getShiprocketConfig(): ShiprocketConfig | null {
  const email = process.env.SHIPROCKET_EMAIL?.trim() ?? "";
  const password = process.env.SHIPROCKET_PASSWORD?.trim() ?? "";
  const bearerToken = process.env.SHIPROCKET_BEARER_TOKEN?.trim();
  const pickupLocationName = process.env.SHIPROCKET_PICKUP_LOCATION?.trim();
  const pickupPostcode = process.env.SHIPROCKET_PICKUP_PINCODE?.trim();
  const hasPasswordAuth = Boolean(email && password);
  const hasBearer = Boolean(bearerToken);
  if (!(hasPasswordAuth || hasBearer) || !pickupLocationName || !pickupPostcode) return null;

  const num = (v: string | undefined, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  return {
    email,
    password,
    bearerToken: bearerToken || undefined,
    pickupLocationName,
    pickupPostcode,
    defaultWeightKg: Math.max(0.05, num(process.env.SHIPROCKET_DEFAULT_WEIGHT_KG, 0.5)),
    defaultLengthCm: Math.max(1, num(process.env.SHIPROCKET_DEFAULT_LENGTH_CM, 20)),
    defaultBreadthCm: Math.max(1, num(process.env.SHIPROCKET_DEFAULT_BREADTH_CM, 15)),
    defaultHeightCm: Math.max(1, num(process.env.SHIPROCKET_DEFAULT_HEIGHT_CM, 5)),
  };
}

export function isShiprocketConfigured(): boolean {
  return getShiprocketConfig() !== null;
}
