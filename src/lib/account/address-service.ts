import type { Types } from "mongoose";
import mongoose from "mongoose";
import { Address } from "@/lib/models/Address";
import { User } from "@/lib/models/User";

const MAX_ADDRESSES = 10;

export type AddressPayload = {
  label: "Home" | "Office" | "Other";
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  isDefault: boolean;
};

export async function migrateEmbeddedAddressesIfNeeded(userId: string | Types.ObjectId): Promise<void> {
  const oid = typeof userId === "string" ? new mongoose.Types.ObjectId(userId) : userId;
  const n = await Address.countDocuments({ userId: oid });
  if (n > 0) return;

  const user = await User.findById(oid).select("addresses").lean();
  const emb = user?.addresses ?? [];
  if (!emb.length) return;

  const docs = emb.map((a, i) => ({
    userId: oid,
    label: "Home" as const,
    fullName: String(a.fullName ?? "").trim() || "—",
    phone: String(a.phone ?? "").trim(),
    line1: String(a.line1 ?? "").trim() || "—",
    line2: a.line2 ? String(a.line2).trim() : undefined,
    city: String(a.city ?? "").trim() || "—",
    state: String(a.state ?? "").trim() || "—",
    pincode: String(a.postalCode ?? "")
      .replace(/\D/g, "")
      .slice(0, 6),
    country: (a.country && String(a.country).trim()) || "India",
    isDefault: i === 0,
  }));

  await Address.insertMany(docs);
  await User.updateOne({ _id: oid }, { $set: { addresses: [] } });
}

export async function listAddressesForUser(userId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId)) return [];
  const oid = new mongoose.Types.ObjectId(userId);
  await migrateEmbeddedAddressesIfNeeded(oid);
  return Address.find({ userId: oid })
    .sort({ isDefault: -1, createdAt: 1 })
    .lean();
}

export async function countAddresses(userId: string): Promise<number> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return 0;
  await migrateEmbeddedAddressesIfNeeded(userId);
  return Address.countDocuments({ userId: new mongoose.Types.ObjectId(userId) });
}

export async function createUserAddress(userId: string, body: AddressPayload) {
  if (!mongoose.Types.ObjectId.isValid(userId)) throw new Error("invalid_user");
  const oid = new mongoose.Types.ObjectId(userId);
  await migrateEmbeddedAddressesIfNeeded(oid);

  const count = await Address.countDocuments({ userId: oid });
  if (count >= MAX_ADDRESSES) throw new Error("address_limit");

  const isDefault = body.isDefault || count === 0;

  if (isDefault) {
    await Address.updateMany({ userId: oid }, { isDefault: false });
  }

  const doc = await Address.create({
    userId: oid,
    label: body.label,
    fullName: body.fullName,
    phone: body.phone,
    line1: body.line1,
    line2: body.line2?.trim() || undefined,
    city: body.city,
    state: body.state,
    pincode: body.pincode,
    country: body.country?.trim() || "India",
    isDefault,
  });

  return doc.toObject();
}

export async function updateUserAddress(
  userId: string,
  addressId: string,
  body: Partial<Omit<AddressPayload, "isDefault">> & { isDefault?: boolean },
) {
  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(addressId)) {
    throw new Error("not_found");
  }
  const oid = new mongoose.Types.ObjectId(userId);
  const aid = new mongoose.Types.ObjectId(addressId);
  await migrateEmbeddedAddressesIfNeeded(oid);

  const existing = await Address.findOne({ _id: aid, userId: oid }).exec();
  if (!existing) throw new Error("not_found");

  if (body.label !== undefined) existing.label = body.label;
  if (body.fullName !== undefined) existing.fullName = body.fullName;
  if (body.phone !== undefined) existing.phone = body.phone;
  if (body.line1 !== undefined) existing.line1 = body.line1;
  if (body.line2 !== undefined) existing.line2 = body.line2?.trim() || undefined;
  if (body.city !== undefined) existing.city = body.city;
  if (body.state !== undefined) existing.state = body.state;
  if (body.pincode !== undefined) existing.pincode = body.pincode;
  if (body.country !== undefined) existing.country = body.country?.trim() || "India";

  if (body.isDefault === true) {
    await Address.updateMany({ userId: oid }, { isDefault: false });
    existing.isDefault = true;
    await existing.save();
    return existing.toObject();
  }

  if (body.isDefault === false && existing.isDefault) {
    const next = await Address.findOne({ userId: oid, _id: { $ne: aid } })
      .sort({ createdAt: 1 })
      .exec();
    if (!next) {
      existing.isDefault = true;
      await existing.save();
      return existing.toObject();
    }
    existing.isDefault = false;
    await existing.save();
    await Address.updateMany({ userId: oid }, { isDefault: false });
    next.isDefault = true;
    await next.save();
    const refreshed = await Address.findById(aid).exec();
    return refreshed!.toObject();
  }

  await existing.save();
  return existing.toObject();
}

export async function deleteUserAddress(userId: string, addressId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(addressId)) {
    throw new Error("not_found");
  }
  const oid = new mongoose.Types.ObjectId(userId);
  const aid = new mongoose.Types.ObjectId(addressId);
  await migrateEmbeddedAddressesIfNeeded(oid);

  const addr = await Address.findOne({ _id: aid, userId: oid }).exec();
  if (!addr) throw new Error("not_found");

  const total = await Address.countDocuments({ userId: oid });
  if (addr.isDefault && total === 1) {
    throw new Error("cannot_delete_only_default");
  }

  if (addr.isDefault) {
    const next = await Address.findOne({ userId: oid, _id: { $ne: aid } })
      .sort({ createdAt: 1 })
      .exec();
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }

  await Address.deleteOne({ _id: aid, userId: oid });
}

export async function setDefaultAddress(userId: string, addressId: string) {
  if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(addressId)) {
    throw new Error("not_found");
  }
  const oid = new mongoose.Types.ObjectId(userId);
  const aid = new mongoose.Types.ObjectId(addressId);
  await migrateEmbeddedAddressesIfNeeded(oid);

  const addr = await Address.findOne({ _id: aid, userId: oid }).exec();
  if (!addr) throw new Error("not_found");

  await Address.updateMany({ userId: oid }, { isDefault: false });
  addr.isDefault = true;
  await addr.save();
}
