import mongoose, { Schema, type InferSchemaType, type Model, type Types } from "mongoose";

const PaymentSchema = new Schema(
  {
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    razorpayOrderId: { type: String, required: true },
    razorpayPaymentId: { type: String },
    amountPaise: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    verified: { type: Boolean, default: false },
    raw: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export type PaymentDoc = InferSchemaType<typeof PaymentSchema> & {
  _id: mongoose.Types.ObjectId;
  orderId: Types.ObjectId;
};

export const Payment: Model<PaymentDoc> =
  mongoose.models.Payment || mongoose.model<PaymentDoc>("Payment", PaymentSchema);
