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
  },
  { timestamps: true }
);

SubcategorySchema.index({ categoryId: 1, slug: 1 }, { unique: true });

export type SubcategoryDoc = InferSchemaType<typeof SubcategorySchema> & {
  _id: mongoose.Types.ObjectId;
  categoryId: Types.ObjectId;
};

export const Subcategory: Model<SubcategoryDoc> =
  mongoose.models.Subcategory || mongoose.model<SubcategoryDoc>("Subcategory", SubcategorySchema);
