import { createHash, randomBytes } from "crypto";

export function hashEmailChangeToken(rawToken: string): string {
  return createHash("sha256").update(rawToken, "utf8").digest("hex");
}

export function newEmailChangeRawToken(): string {
  return randomBytes(32).toString("hex");
}
