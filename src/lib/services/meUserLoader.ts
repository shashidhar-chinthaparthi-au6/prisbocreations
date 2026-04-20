import type { AddressDoc } from "@/lib/models/Address";
import { listAddressesForUser } from "@/lib/account/address-service";
import { getUserById } from "@/lib/services/authService";
import { userDocWithAddressesToMeDto, type MeUserDto } from "@/lib/user-me-dto";

export async function loadMeUserDto(userId: string): Promise<MeUserDto | null> {
  const user = await getUserById(userId);
  if (!user) return null;
  if (user.deletedAt || String(user.passwordHash ?? "") === "DELETED") return null;
  const rows = await listAddressesForUser(userId);
  const fresh = (await getUserById(userId)) ?? user;
  return userDocWithAddressesToMeDto(fresh, rows as AddressDoc[]);
}
