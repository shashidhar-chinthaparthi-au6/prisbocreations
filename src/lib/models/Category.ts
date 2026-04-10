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
  },
  { timestamps: true }
);

export type CategoryDoc = InferSchemaType<typeof CategorySchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Category: Model<CategoryDoc> =
  mongoose.models.Category || mongoose.model<CategoryDoc>("Category", CategorySchema);
