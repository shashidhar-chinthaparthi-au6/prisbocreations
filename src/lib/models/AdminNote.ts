import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const AdminNoteSchema = new Schema(
  {
    studioKey: { type: String, trim: true, sparse: true, unique: true },
    msg: { type: String, required: true },
    at: { type: Number, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type AdminNoteDoc = InferSchemaType<typeof AdminNoteSchema> & {
  _id: mongoose.Types.ObjectId;
};

const NAME = "AdminNote";
if (mongoose.models[NAME]) delete mongoose.models[NAME];
Reflect.deleteProperty(mongoose.connection.models as Record<string, unknown>, NAME);

export const AdminNote: Model<AdminNoteDoc> = mongoose.model<AdminNoteDoc>(NAME, AdminNoteSchema);
