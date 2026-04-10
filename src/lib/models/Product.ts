import mongoose, { Schema, type InferSchemaType, type Model, type Types } from "mongoose";

const ProductSchema = new Schema(
  {
    subcategoryId: {
      type: Schema.Types.ObjectId,
      ref: "Subcategory",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, required: true },
    pricePaise: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },
    sku: { type: String, required: true, unique: true, trim: true },
    stock: { type: Number, required: true, default: 0, min: 0 },
    images: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type ProductDoc = InferSchemaType<typeof ProductSchema> & {
  _id: mongoose.Types.ObjectId;
  subcategoryId: Types.ObjectId;
};

export const Product: Model<ProductDoc> =
  mongoose.models.Product || mongoose.model<ProductDoc>("Product", ProductSchema);
