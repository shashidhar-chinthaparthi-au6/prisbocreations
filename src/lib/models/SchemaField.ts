import mongoose, { Schema, type InferSchemaType, type Model, type Types } from "mongoose";
import { FIELD_TYPES, type FieldType } from "@/lib/models/schema-field-constants";

export { FIELD_TYPES, type FieldType };

const SchemaFieldSchema = new Schema(
  {
    subcategoryId: {
      type: Schema.Types.ObjectId,
      ref: "Subcategory",
      required: true,
      index: true,
    },
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    fieldType: { type: String, enum: FIELD_TYPES, required: true },
    options: { type: [String], default: [] },
    isHighlight: { type: Boolean, default: false },
    isRequired: { type: Boolean, default: false },
    displayOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

SchemaFieldSchema.index({ subcategoryId: 1, key: 1 }, { unique: true });
SchemaFieldSchema.index({ subcategoryId: 1, displayOrder: 1 });

export type SchemaFieldDoc = InferSchemaType<typeof SchemaFieldSchema> & {
  _id: mongoose.Types.ObjectId;
  subcategoryId: Types.ObjectId;
};

if (mongoose.models.SchemaField) {
  delete mongoose.models.SchemaField;
}

export const SchemaField: Model<SchemaFieldDoc> = mongoose.model<SchemaFieldDoc>(
  "SchemaField",
  SchemaFieldSchema,
);
