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
  status: "new" | "contacted" | "quoted" | "won" | "lost";
  createdAt: Date;
  studioKey?: string;
  studio?: unknown;
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
    enum: ["new", "contacted", "quoted", "won", "lost"],
    default: "new",
  },
  createdAt: { type: Date, default: Date.now },
  studioKey: { type: String, trim: true, sparse: true, unique: true },
  studio: { type: Schema.Types.Mixed },
});

if (models.BulkInquiry) delete models.BulkInquiry;

export const BulkInquiry = model<IBulkInquiry>("BulkInquiry", BulkInquirySchema);
