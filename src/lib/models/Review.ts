import mongoose, { Schema, type InferSchemaType, type Model, type Types } from "mongoose";

const ReviewSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    guestName: { type: String, trim: true, default: "" },
    guestEmail: { type: String, lowercase: true, trim: true, default: null },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, default: "" },
    body: { type: String, required: true, trim: true },
    photos: { type: [String], default: [] },
    variantId: { type: String, trim: true, default: "" },
    variantName: { type: String, trim: true, default: "" },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", default: null },
    /** Line index in order.items as string, or synthetic id */
    orderItemId: { type: String, trim: true, default: "" },
    isVerified: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    isRejected: { type: Boolean, default: false },
    rejectedReason: { type: String, trim: true, default: "" },
    helpfulCount: { type: Number, default: 0, min: 0 },
    notHelpfulCount: { type: Number, default: 0, min: 0 },
    adminReply: { type: String, trim: true, default: "" },
    adminRepliedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

ReviewSchema.index({ productId: 1, createdAt: -1 });
ReviewSchema.index(
  { productId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $exists: true, $ne: null } } },
);
ReviewSchema.index(
  { productId: 1, guestEmail: 1 },
  { unique: true, partialFilterExpression: { guestEmail: { $exists: true, $nin: [null, ""] } } },
);

export type ReviewDoc = InferSchemaType<typeof ReviewSchema> & {
  _id: mongoose.Types.ObjectId;
  productId: Types.ObjectId;
};

const NAME = "Review";
if (mongoose.models[NAME]) delete mongoose.models[NAME];
Reflect.deleteProperty(mongoose.connection.models as Record<string, unknown>, NAME);

export const Review: Model<ReviewDoc> = mongoose.model<ReviewDoc>(NAME, ReviewSchema);
