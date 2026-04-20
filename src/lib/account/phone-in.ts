/** Normalize to 10-digit Indian mobile (leading 91 optional). Empty string if invalid. */
export function normalizeIndianMobile10(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) return d.slice(2);
  if (d.length === 11 && d.startsWith("0")) return d.slice(1);
  if (d.length === 10) return d;
  return "";
}

export function isIndianMobile10(digits: string): boolean {
  return /^[6-9]\d{9}$/.test(digits);
}
