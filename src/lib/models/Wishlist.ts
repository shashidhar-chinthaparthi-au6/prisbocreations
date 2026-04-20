import mongoose, { Schema, type InferSchemaType, type Model, type Types } from "mongoose";

const WishlistSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    productIds: { type: [{ type: Schema.Types.ObjectId, ref: "Product" }], default: [] },
  },
  { timestamps: true },
);

export type WishlistDoc = InferSchemaType<typeof WishlistSchema> & {
  _id: mongoose.Types.ObjectId;
  userId: Types.ObjectId;
};

const NAME = "Wishlist";
if (mongoose.models[NAME]) delete mongoose.models[NAME];
Reflect.deleteProperty(mongoose.connection.models as Record<string, unknown>, NAME);

export const Wishlist: Model<WishlistDoc> = mongoose.model<WishlistDoc>(NAME, WishlistSchema);
