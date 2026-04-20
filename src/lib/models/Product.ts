import mongoose, { Schema, type InferSchemaType, type Model, type Types } from "mongoose";

const ProductOptionSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    pricePaise: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, default: 0, min: 0 },
    sku: { type: String, trim: true, default: "" },
    description: { type: String, default: "" },
    specificationRows: {
      type: [
        {
          key: { type: String, required: true, trim: true },
          value: { type: String, required: true, trim: true },
        },
      ],
      default: [],
    },
    featureLines: { type: [String], default: [] },
    highlightLines: { type: [String], default: [] },
  },
  { _id: false },
);

const LegacyProductColorVariantSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    images: { type: [String], default: [] },
  },
  { _id: false },
);

const VariantImageSchema = new Schema(
  {
    url: { type: String, required: true },
    isPrimary: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
    altText: { type: String },
  },
  { _id: true },
);

const SizeStockSchema = new Schema(
  {
    size: { type: String, required: true },
    stock: { type: Number, default: 0, min: 0 },
    priceOverride: { type: Number, default: null },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const ColourVariantSchema = new Schema(
  {
    displayName: { type: String, required: true, trim: true },
    hexCode: { type: String, required: true, trim: true },
    skuSuffix: { type: String, required: true, trim: true },
    basePrice: { type: Number, required: true, min: 0 },
    mrp: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    images: { type: [VariantImageSchema], default: [] },
    sizeStocks: { type: [SizeStockSchema], default: [] },
  },
  { _id: true },
);

const ProductSchema = new Schema(
  {
    /** Admin catalog v2 */
    skuBase: { type: String, trim: true, sparse: true, unique: true },
    brand: { type: String, trim: true, default: "" },
    subcategoryId: { type: Schema.Types.ObjectId, ref: "Subcategory", index: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", index: true },
    hasColourVariants: { type: Boolean, default: true },
    hasSizePricing: { type: Boolean, default: false },
    sizesNotApplicable: { type: Boolean, default: false },
    packOf: { type: Number, default: 1, min: 1 },
    descriptionTemplate: { type: String, default: "" },
    specValues: { type: Schema.Types.Mixed, default: {} },
    manufacturerName: { type: String },
    manufacturerAddress: { type: String },
    packerSameAsMfr: { type: Boolean, default: true },
    packerAddress: { type: String },
    countryOfOrigin: { type: String, default: "India" },
    genericName: { type: String },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      default: "DRAFT",
      index: true,
    },
    publishedAt: { type: Date },
    scheduledPublishAt: { type: Date },
    colourVariants: { type: [ColourVariantSchema], default: [] },

    /** Storefront + legacy */
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    specificationRows: {
      type: [
        {
          key: { type: String, required: true, trim: true },
          value: { type: String, required: true, trim: true },
        },
      ],
      default: [],
    },
    featureLines: { type: [String], default: [] },
    highlightLines: { type: [String], default: [] },
    specificationsHtml: { type: String },
    featuresHtml: { type: String },
    highlightsHtml: { type: String },
    pricePaise: { type: Number, required: true, min: 0 },
    compareAtPaise: { type: Number, min: 0 },
    currency: { type: String, default: "INR" },
    sku: { type: String, required: true, unique: true, trim: true },
    stock: { type: Number, required: true, default: 0, min: 0 },
    options: { type: [ProductOptionSchema], default: [] },
    colorVariants: { type: [LegacyProductColorVariantSchema], default: [] },
    images: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    featured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    allowCustomerCustomization: { type: Boolean, default: false },
    customizationInstructions: { type: String, default: "" },
    customizationTextLabel: { type: String, default: "Notes / text to print" },
    customizationTextPlaceholder: { type: String, default: "" },
    customizationTextMaxLength: { type: Number, default: 500 },
    customizationImageRequired: { type: Boolean, default: true },
    customizationTextRequired: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type ProductDoc = InferSchemaType<typeof ProductSchema> & {
  _id: mongoose.Types.ObjectId;
  categoryId?: Types.ObjectId;
  subcategoryId?: Types.ObjectId;
};

if (mongoose.models.Product) {
  delete mongoose.models.Product;
}

export const Product: Model<ProductDoc> = mongoose.model<ProductDoc>("Product", ProductSchema);

export type ColourVariantSubdoc = InferSchemaType<typeof ColourVariantSchema> & {
  _id: mongoose.Types.ObjectId;
};
export type VariantImageSubdoc = InferSchemaType<typeof VariantImageSchema> & {
  _id: mongoose.Types.ObjectId;
};
export type SizeStockSubdoc = InferSchemaType<typeof SizeStockSchema>;
