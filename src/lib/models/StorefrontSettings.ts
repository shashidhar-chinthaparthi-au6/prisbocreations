import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const StorefrontSettingsSchema = new Schema(
  {
    singletonKey: { type: String, required: true, unique: true, default: "default" },
    /** When false, Prisbo Assistant is hidden on the storefront and API routes refuse requests. */
    assistantEnabled: { type: Boolean, default: true },
    /** Announcement strip on the shop. */
    banner: { type: String, default: "" },
    /** When false, checkout refuses new orders. */
    ordersOpen: { type: Boolean, default: true },
    hero: {
      eyebrow: { type: String, default: "" },
      l1: { type: String, default: "" },
      l2: { type: String, default: "" },
      sub: { type: String, default: "" },
      cta: { type: String, default: "" },
      link: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

export type StorefrontSettingsDoc = InferSchemaType<typeof StorefrontSettingsSchema> & {
  _id: mongoose.Types.ObjectId;
};

const NAME = "StorefrontSettings";
if (mongoose.models[NAME]) delete mongoose.models[NAME];
Reflect.deleteProperty(mongoose.connection.models as Record<string, unknown>, NAME);

export const StorefrontSettings: Model<StorefrontSettingsDoc> = mongoose.model<StorefrontSettingsDoc>(
  NAME,
  StorefrontSettingsSchema,
);
