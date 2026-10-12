import mongoose, { Schema, type InferSchemaType, type Model, type Types } from "mongoose";

const SubcategorySchema = new Schema(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    images: { type: [String], default: [] },
    imageUrl: { type: String },
    /** `{ headers: string[], rows: string[][] }` for storefront size chart modal */
    sizeChartData: { type: Schema.Types.Mixed, default: null },
    studioKey: { type: String, trim: true, sparse: true, unique: true },
  },
  { timestamps: true }
);

SubcategorySchema.index({ categoryId: 1, slug: 1 }, { unique: true });

export type SubcategoryDoc = InferSchemaType<typeof SubcategorySchema> & {
  _id: mongoose.Types.ObjectId;
  categoryId: Types.ObjectId;
};

const SUBCATEGORY_MODEL = "Subcategory";
if (mongoose.models[SUBCATEGORY_MODEL]) delete mongoose.models[SUBCATEGORY_MODEL];
Reflect.deleteProperty(mongoose.connection.models as Record<string, unknown>, SUBCATEGORY_MODEL);

export const Subcategory: Model<SubcategoryDoc> = mongoose.model<SubcategoryDoc>(
  SUBCATEGORY_MODEL,
  SubcategorySchema,
);
