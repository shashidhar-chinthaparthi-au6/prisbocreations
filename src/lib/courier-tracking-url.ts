/**
 * Public tracking links for customers. Prefer a saved Shiprocket/courier URL when valid;
 * otherwise map known carriers by name; finally Shiprocket's generic AWB page.
 */
export function shiprocketAggregateTrackingUrl(awb: string): string {
  const a = awb.trim();
  return `https://shiprocket.co/tracking/${encodeURIComponent(a)}`;
}

export function resolveCustomerTrackingUrl(
  awb: string,
  opts?: { storedUrl?: string | null; courierName?: string | null },
): string {
  const a = awb.trim();
  if (!a) return "";
  const stored = opts?.storedUrl?.trim() ?? "";
  if (stored.startsWith("http://") || stored.startsWith("https://")) return stored;

  const c = (opts?.courierName ?? "").toLowerCase();
  if (c.includes("blue dart")) {
    return `https://www.bluedart.com/web/guest/track-details?trackConsignmentNo=${encodeURIComponent(a)}`;
  }
  if (c.includes("delhivery")) {
    return `https://www.delhivery.com/track/package/${encodeURIComponent(a)}`;
  }
  if (c.includes("dtdc")) {
    return `https://www.dtdc.in/trace.asp?ltype=cnno&cnno=${encodeURIComponent(a)}`;
  }
  if (c.includes("xpressbees")) {
    return `https://www.xpressbees.com/track?awbNo=${encodeURIComponent(a)}`;
  }
  return shiprocketAggregateTrackingUrl(a);
}
