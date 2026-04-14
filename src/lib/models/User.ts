import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const AddressSchema = new Schema(
  {
    fullName: String,
    phone: String,
    line1: String,
    line2: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    role: { type: String, enum: ["customer", "admin"], default: "customer" },
    /** Public HTTPS URL (e.g. S3) for header / profile. */
    profileImageUrl: { type: String, trim: true },
    addresses: { type: [AddressSchema], default: [] },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: mongoose.Types.ObjectId };

/** Next.js dev HMR can keep a stale compiled model without newer schema paths; re-register so updates like `profileImageUrl` are not stripped by strict mode. */
const USER_MODEL = "User";
if (mongoose.models[USER_MODEL]) {
  delete mongoose.models[USER_MODEL];
}
Reflect.deleteProperty(mongoose.connection.models as Record<string, unknown>, USER_MODEL);

export const User: Model<UserDoc> = mongoose.model<UserDoc>(USER_MODEL, UserSchema);
