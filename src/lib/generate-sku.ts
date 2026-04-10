import { randomBytes } from "crypto";

/** Unique stock-keeping code for new products (time + random, collision-resistant). */
export function generateSku(): string {
  const time = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(4).toString("hex").toUpperCase();
  return `PRB-${time}-${rand}`;
}
