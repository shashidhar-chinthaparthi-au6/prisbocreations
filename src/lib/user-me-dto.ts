export type MeUserDto = {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string;
  profileImageUrl: string;
  addresses: {
    fullName: string;
    phone: string;
    line1: string;
    line2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }[];
};

export function userDocToMeDto(user: {
  _id: unknown;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  phone?: string | null;
  profileImageUrl?: string | null;
  addresses?: unknown;
}) {
  const u = user as Record<string, unknown>;
  const addresses = Array.isArray(u.addresses)
    ? (u.addresses as Record<string, string>[]).map((a) => ({
        fullName: a.fullName ?? "",
        phone: a.phone ?? "",
        line1: a.line1 ?? "",
        line2: a.line2 ?? "",
        city: a.city ?? "",
        state: a.state ?? "",
        postalCode: a.postalCode ?? "",
        country: a.country ?? "India",
      }))
    : [];
  return {
    id: u._id != null ? String(u._id) : "",
    email: String(u.email ?? ""),
    name: String(u.name ?? ""),
    role: String(u.role ?? "customer"),
    phone: String(u.phone ?? ""),
    profileImageUrl: String(u.profileImageUrl ?? ""),
    addresses,
  } satisfies MeUserDto;
}
