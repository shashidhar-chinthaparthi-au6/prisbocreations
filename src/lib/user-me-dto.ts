import { computeInitials } from "@/lib/account/compute-initials";
import type { MeAddressDto } from "@/lib/account/user-address-dto";
import { addressDocToMeDto, embeddedAddressToMeDto } from "@/lib/account/user-address-dto";
import type { AddressDoc } from "@/lib/models/Address";

export type MeUserDto = {
  id: string;
  email: string;
  name: string;
  role: string;
  phone: string;
  profileImageUrl: string;
  /** Same as `profileImageUrl` for account UI. */
  avatarUrl: string | null;
  avatarInitials: string;
  notifOrderUpdates: boolean;
  notifOffers: boolean;
  notifSMS: boolean;
  createdAt: string | null;
  addresses: MeAddressDto[];
};

export function userDocToMeDto(user: {
  _id: unknown;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  phone?: string | null;
  profileImageUrl?: string | null;
  avatarInitials?: string | null;
  notifOrderUpdates?: boolean | null;
  notifOffers?: boolean | null;
  notifSMS?: boolean | null;
  addresses?: unknown;
  createdAt?: Date | string | null;
}) {
  const u = user as Record<string, unknown>;
  const addresses = Array.isArray(u.addresses)
    ? (u.addresses as Record<string, string>[]).map((a, i) => embeddedAddressToMeDto(a, i))
    : [];
  const profileImageUrl = String(u.profileImageUrl ?? "").trim();
  const avatarUrl = profileImageUrl || null;
  const nameStr = String(u.name ?? "");
  const initialsStored = String(u.avatarInitials ?? "").trim();
  const createdRaw = u.createdAt;
  const createdAt =
    createdRaw instanceof Date
      ? createdRaw.toISOString()
      : typeof createdRaw === "string"
        ? new Date(createdRaw).toISOString()
        : null;

  return {
    id: u._id != null ? String(u._id) : "",
    email: String(u.email ?? ""),
    name: nameStr,
    role: String(u.role ?? "customer"),
    phone: String(u.phone ?? ""),
    profileImageUrl,
    avatarUrl,
    avatarInitials: initialsStored || (nameStr ? computeInitials(nameStr) : "?"),
    notifOrderUpdates: u.notifOrderUpdates !== false,
    notifOffers: u.notifOffers === true,
    notifSMS: u.notifSMS !== false,
    createdAt,
    addresses,
  } satisfies MeUserDto;
}

export function userDocWithAddressesToMeDto(
  user: Parameters<typeof userDocToMeDto>[0],
  savedAddresses: AddressDoc[],
): MeUserDto {
  const base = userDocToMeDto(user);
  if (savedAddresses.length > 0) {
    return {
      ...base,
      addresses: savedAddresses.map((d) => addressDocToMeDto(d)),
    };
  }
  return base;
}
