/** Rough zone hints for delivery copy (not courier-accurate). */
export function estimateZone(pincode: string): {
  days: string;
  isCODAvailable: boolean;
  /** When false, show “we may not deliver” copy — heuristic only */
  serviceable: boolean;
} {
  const p = pincode.replace(/\D/g, "").slice(0, 6);
  if (p.length !== 6) {
    return { days: "5-7", isCODAvailable: true, serviceable: true };
  }
  const prefix2 = p.slice(0, 2);
  /** Metro-ish first digits — illustrative tiers for UX copy. */
  const metro = new Set([
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
    "21",
    "22",
    "40",
    "41",
    "42",
    "43",
    "44",
    "45",
    "46",
    "47",
    "48",
    "49",
    "50",
    "51",
    "52",
    "53",
    "54",
    "55",
    "56",
    "57",
    "58",
    "59",
    "60",
    "61",
    "62",
    "63",
    "64",
    "65",
    "66",
    "67",
    "68",
    "69",
    "70",
  ]);
  const tier2 = new Set(["30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "75", "76", "77", "78", "79"]);
  if (metro.has(prefix2)) return { days: "3-5", isCODAvailable: true, serviceable: true };
  if (tier2.has(prefix2)) return { days: "4-6", isCODAvailable: true, serviceable: true };
  return { days: "5-7", isCODAvailable: true, serviceable: true };
}
