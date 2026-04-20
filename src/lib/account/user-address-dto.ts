/** Shape used by checkout and legacy `/api/v1/auth/me` — `postalCode` mirrors `pincode`. */
export type MeAddressDto = {
  id?: string;
  label?: string;
  isDefault?: boolean;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export function addressDocToMeDto(doc: {
  _id: { toString: () => string };
  label?: string;
  isDefault?: boolean;
  fullName?: string;
  phone?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}): MeAddressDto {
  const pin = String(doc.pincode ?? "").trim();
  return {
    id: doc._id.toString(),
    label: doc.label,
    isDefault: Boolean(doc.isDefault),
    fullName: String(doc.fullName ?? ""),
    phone: String(doc.phone ?? ""),
    line1: String(doc.line1 ?? ""),
    line2: String(doc.line2 ?? ""),
    city: String(doc.city ?? ""),
    state: String(doc.state ?? ""),
    postalCode: pin,
    country: String(doc.country ?? "India"),
  };
}

export function embeddedAddressToMeDto(
  a: Record<string, string | undefined>,
  index: number,
): MeAddressDto {
  return {
    id: `legacy-${index}`,
    label: "Home",
    isDefault: index === 0,
    fullName: a.fullName ?? "",
    phone: a.phone ?? "",
    line1: a.line1 ?? "",
    line2: a.line2 ?? "",
    city: a.city ?? "",
    state: a.state ?? "",
    postalCode: String(a.postalCode ?? "").trim(),
    country: a.country ?? "India",
  };
}
