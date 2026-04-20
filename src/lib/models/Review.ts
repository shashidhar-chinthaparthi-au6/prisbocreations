import mongoose, { Schema, type InferSchemaType, type Model, type Types } from "mongoose";

const ReviewSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    guestName: { type: String, trim: true, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    body: { type: String, required: true, trim: true },
    variantId: { type: String, trim: true, default: "" },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    isVerified: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true },
);

ReviewSchema.index({ productId: 1, createdAt: -1 });

export type ReviewDoc = InferSchemaType<typeof ReviewSchema> & {
  _id: mongoose.Types.ObjectId;
  productId: Types.ObjectId;
};

const NAME = "Review";
if (mongoose.models[NAME]) delete mongoose.models[NAME];
Reflect.deleteProperty(mongoose.connection.models as Record<string, unknown>, NAME);

export const Review: Model<ReviewDoc> = mongoose.model<ReviewDoc>(NAME, ReviewSchema);
