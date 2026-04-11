import mongoose, { Schema, type InferSchemaType, type Model, type Types } from "mongoose";

const ProductOptionSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    pricePaise: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, default: 0, min: 0 },
    sku: { type: String, trim: true, default: "" },
    /** Optional rich HTML; storefront falls back to product description when empty. */
    description: { type: String, default: "" },
  },
  { _id: false }
);

const ProductColorVariantSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    images: { type: [String], default: [] },
  },
  { _id: false }
);

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
    /** When non-empty, buyers must pick an option (separate price/stock per row). */
    options: { type: [ProductOptionSchema], default: [] },
    /** Ordered color swatches; each may have its own gallery (falls back to `images` when empty). */
    colorVariants: { type: [ProductColorVariantSchema], default: [] },
    images: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    /** Buyer can upload an image + notes (e.g. personalisation). */
    allowCustomerCustomization: { type: Boolean, default: false },
    customizationInstructions: { type: String, default: "" },
    customizationTextLabel: { type: String, default: "Notes / text to print" },
    customizationTextPlaceholder: { type: String, default: "" },
    customizationTextMaxLength: { type: Number, default: 500 },
    customizationImageRequired: { type: Boolean, default: true },
    customizationTextRequired: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export type ProductDoc = InferSchemaType<typeof ProductSchema> & {
  _id: mongoose.Types.ObjectId;
  subcategoryId: Types.ObjectId;
};

/**
 * Drop cached model so schema changes (e.g. new option fields) apply. Next.js HMR and
 * `mongoose.models.X || model()` otherwise keep the old schema and strip unknown paths on save.
 */
if (mongoose.models.Product) {
  delete mongoose.models.Product;
}

export const Product: Model<ProductDoc> = mongoose.model<ProductDoc>(
  "Product",
  ProductSchema,
);
