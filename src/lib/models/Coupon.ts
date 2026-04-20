import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const CouponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: ["PERCENT", "FIXED"], required: true },
    value: { type: Number, required: true },
    minOrderValuePaise: { type: Number, default: null },
    maxUses: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type CouponDoc = InferSchemaType<typeof CouponSchema> & { _id: mongoose.Types.ObjectId };

const NAME = "Coupon";
if (mongoose.models[NAME]) delete mongoose.models[NAME];
Reflect.deleteProperty(mongoose.connection.models as Record<string, unknown>, NAME);

export const Coupon: Model<CouponDoc> = mongoose.model<CouponDoc>(NAME, CouponSchema);
