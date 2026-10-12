import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const CategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    /** Gallery URLs; first is the primary hero. Legacy single field below. */
    images: { type: [String], default: [] },
    imageUrl: { type: String },
    studioKey: { type: String, trim: true, sparse: true, unique: true },
  },
  { timestamps: true }
);

export type CategoryDoc = InferSchemaType<typeof CategorySchema> & {
  _id: mongoose.Types.ObjectId;
};

const CATEGORY_MODEL = "Category";
if (mongoose.models[CATEGORY_MODEL]) delete mongoose.models[CATEGORY_MODEL];
Reflect.deleteProperty(mongoose.connection.models as Record<string, unknown>, CATEGORY_MODEL);

export const Category: Model<CategoryDoc> = mongoose.model<CategoryDoc>(CATEGORY_MODEL, CategorySchema);
