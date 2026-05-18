import mongoose, { Schema, type Document, model, models } from "mongoose";

export interface IBulkInquiry extends Document {
  company: string;
  contactName: string;
  email: string;
  phone: string;
  productInterest?: string;
  quantity?: number;
  deadlineDate?: Date;
  notes?: string;
  status: "new" | "contacted" | "won" | "lost";
  createdAt: Date;
}

const BulkInquirySchema = new Schema<IBulkInquiry>({
  company: { type: String, required: true, trim: true },
  contactName: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  phone: { type: String, required: true, trim: true },
  productInterest: { type: String, trim: true },
  quantity: { type: Number, min: 1 },
  deadlineDate: { type: Date },
  notes: { type: String, trim: true, maxlength: 1000 },
  status: {
    type: String,
    enum: ["new", "contacted", "won", "lost"],
    default: "new",
  },
  createdAt: { type: Date, default: Date.now },
});

export const BulkInquiry =
  (models.BulkInquiry as mongoose.Model<IBulkInquiry>) ||
  model<IBulkInquiry>("BulkInquiry", BulkInquirySchema);
