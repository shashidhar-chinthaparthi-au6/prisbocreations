import mongoose, { Schema, type InferSchemaType, type Model, type Types } from "mongoose";

const LABELS = ["Home", "Office", "Other"] as const;

const AddressSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    label: { type: String, enum: LABELS, default: "Home" },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    country: { type: String, default: "India", trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

AddressSchema.index({ userId: 1, isDefault: -1 });
AddressSchema.index({ userId: 1, createdAt: 1 });

export type AddressDoc = InferSchemaType<typeof AddressSchema> & {
  _id: Types.ObjectId;
};

const NAME = "Address";
if (mongoose.models[NAME]) {
  delete mongoose.models[NAME];
}
Reflect.deleteProperty(mongoose.connection.models as Record<string, unknown>, NAME);

export const Address: Model<AddressDoc> = mongoose.model<AddressDoc>(NAME, AddressSchema);
